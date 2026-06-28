/* =====================================================================
   自治体公募LP 案B（共創・関係人口軸） — script_b.js
   - ヒーロー：受賞/応募作品サムネのモザイク背景を生成
   - スクロールフェードイン
   - スムーススクロール（ヘッダー高さ補正）
   - GA4計測：scroll(90%) / 各CTAクリック / フォーム送信
   - 応募フォーム送信（Airtable連携プレースホルダ＋mailtoフォールバック）
   現行 script.js と name 互換（org/name/email/dept/tel/theme/budget/other/agree）。
   ===================================================================== */

(() => {
  'use strict';

  /* ---------- GA4 安全ラッパー ---------- */
  const ga = (name, params) => {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    } catch (_) { /* noop */ }
  };

  /* ---------- 0. ヒーロー・モザイク背景 ---------- */
  const YT_IDS = [
    'BWNOij_828o','wXico4LIYn0','auurYkEiyMU','f9fHyx6Yxe0','UCqb182BEHg',
    'qXipl3DEuFQ','Boqi2jQr7SU','xFahIB58zRs','G6h4b9RY0zg','UUsJP_r0yB8',
    'gB219Ej7OnE','8TdPoCHfDwE','ZcEbgODfL4g','DDFIxU-SY4E','F_oLNkafHzg',
    'KEGuv30eg50','oWqKbm8wnNE','Ckr7EeozaBQ','-QzFBNrApH0','NEnJQW8iUK0',
    'Btva7TyNmEA','QPMSbpKdrDQ','xv-yZwIJPbA','1cPwGrFyxJY','IZ2EhCq0bHI',
    'k8qpQBXyAak','xqT4H7YqQ8M','w02rCpSK1B8','bSL9eMcYJAQ','dQdwzA6-OLQ','V-9VbBNbnLY'
  ];
  const mosaic = document.getElementById('heroMosaic');
  if (mosaic) {
    const TILES = 48; // グリッドを埋めるタイル数
    const frag = document.createDocumentFragment();
    for (let i = 0; i < TILES; i++) {
      const id = YT_IDS[i % YT_IDS.length];
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
      frag.appendChild(img);
    }
    mosaic.appendChild(frag);
  }

  /* ---------- 1. フェードインアニメーション ---------- */
  const fadeTargets = document.querySelectorAll(
    '.value-card, .voice, .vvoice, .plan, .faq__item, .facts__item, .timeline__step, ' +
    '.flow__roles, .ringi, .compare__wrap, .concept__step, .next-outlets, .media-bar, .closing'
  );
  fadeTargets.forEach((el) => el.classList.add('fade-up'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    fadeTargets.forEach((el) => io.observe(el));
  } else {
    fadeTargets.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- 2. スムーススクロール（ヘッダー高さ補正） ---------- */
  const nav = document.querySelector('.nav');
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const offset = (nav?.offsetHeight || 0) + 12;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- 3. GA4：CTA / 実物リンクのクリック計測 ---------- */
  document.querySelectorAll('[data-cta]').forEach((el) => {
    el.addEventListener('click', () => {
      ga('cta_click', {
        cta_id: el.getAttribute('data-cta'),
        cta_text: (el.textContent || '').trim().slice(0, 60),
        link_url: el.getAttribute('href') || '',
      });
    });
  });

  /* ---------- 4. GA4：スクロール到達率（25/50/75/90%） ---------- */
  (() => {
    const marks = [25, 50, 75, 90];
    const fired = new Set();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.pageYOffset / scrollable) * 100;
      marks.forEach((m) => {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          ga('scroll_depth', { percent: m });
        }
      });
      if (fired.size === marks.length) window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ---------- 5. フォーム送信 ---------- */
  const form = document.getElementById('applyForm');
  const msg = document.getElementById('formMessage');
  const lpType = document.body?.dataset?.lp || 'production';
  const isPartnerLp = lpType === 'partner';

  const AIRTABLE_ENDPOINT = ''; // 例: 'https://api.airtable.com/v0/appXXXX/Submissions'
  const AIRTABLE_TOKEN = '';
  const FALLBACK_MAIL = 'info@metagri-labo.com';

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'form__msg';
      msg.textContent = '';

      if (!form.checkValidity()) {
        form.reportValidity();
        ga('form_invalid', {});
        return;
      }

      const fd = new FormData(form);
      const themes = fd.getAll('theme');
      const payload = {
        organization: fd.get('org')?.trim() || '',
        name: fd.get('name')?.trim() || '',
        department: fd.get('dept')?.trim() || '',
        email: fd.get('email')?.trim() || '',
        tel: fd.get('tel')?.trim() || '',
        themes,
        budget: fd.get('budget') || '',
        area: fd.get('area')?.trim() || '',
        other: fd.get('other')?.trim() || '',
        submittedAt: new Date().toISOString(),
        source: isPartnerLp ? 'pr-contest-lp / partner.html' : 'pr-contest-lp / index.html (production)',
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      try {
        if (AIRTABLE_ENDPOINT && AIRTABLE_TOKEN) {
          const res = await fetch(AIRTABLE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                Organization: payload.organization,
                Name: payload.name,
                Department: payload.department,
                Email: payload.email,
                Tel: payload.tel,
                Themes: payload.themes.join(', '),
                Budget: payload.budget,
                Area: payload.area,
                Other: payload.other,
                SubmittedAt: payload.submittedAt,
                Source: payload.source,
              },
            }),
          });
          if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
        } else {
          const subjectPrefix = isPartnerLp ? '地域共創パートナー申込' : '自治体公募フォーム';
          const subject = `【${subjectPrefix}】${payload.organization} ${payload.name}様`;
          const body = formatMailBody(payload);
          const mailto = `mailto:${FALLBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailto;
        }

        ga('form_submit', {
          budget: payload.budget,
          themes: payload.themes.join('|'),
          form_id: 'apply',
        });

        msg.classList.add('is-success');
        msg.textContent = '送信ありがとうございました。3営業日以内にご連絡いたします。';
        form.reset();
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        console.error('[apply] submission failed:', err);
        ga('form_error', { message: String(err).slice(0, 80) });
        msg.classList.add('is-error');
        msg.textContent = `送信に失敗しました。お手数ですが ${FALLBACK_MAIL} まで直接ご連絡ください。`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

  function formatMailBody(p) {
    const title = isPartnerLp
      ? '＝＝＝ 地域共創パートナー申込フォーム ＝＝＝'
      : '＝＝＝ 自治体PR動画コンテスト 公募フォーム（案B） ＝＝＝';

    const lines = [
      title,
      '',
      `■ ${isPartnerLp ? '企業・団体名' : '自治体名・組織名'}：${p.organization}`,
      `■ ご担当者名　　　：${p.name}`,
      `■ 所属部署　　　　：${p.department || '-'}`,
      `■ メールアドレス　：${p.email}`,
      `■ 電話番号　　　　：${p.tel || '-'}`,
      '',
      `■ ${isPartnerLp ? '関連領域' : '関心テーマ'}　　　：${p.themes.join(' / ') || '-'}`,
      `■ ${isPartnerLp ? '提携形態' : '想定予算規模'}　　：${p.budget}`,
    ];

    if (isPartnerLp) {
      lines.push(`■ 想定自治体・地域：${p.area || '-'}`);
    }

    return lines.concat([
      '',
      `■ その他質問・要望：`,
      p.other || '-',
      '',
      '＝＝＝',
      `送信日時：${p.submittedAt}`,
      `送信元　：${p.source}`,
    ]).join('\n');
  }
})();

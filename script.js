/* =====================================================================
   自治体PR動画コンテスト 公募LP — script.js
   - スクロール時のフェードイン
   - 応募フォーム送信（Airtable連携プレースホルダ）
   - スムーススクロール
   ===================================================================== */

(() => {
  'use strict';

  /* ---------- 1. フェードインアニメーション ---------- */
  const fadeTargets = document.querySelectorAll(
    '.problem__card, .case__card, .voice, .value__card, .roles__col, .plan, .faq__item, .closing__body, .facts__item, .flow__step, .flow__roles, .ringi, .compare__wrap, .story, .stories__note'
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

  /* ---------- 3. フォーム送信 ---------- */
  const form = document.getElementById('applyForm');
  const msg = document.getElementById('formMessage');

  /**
   * Airtable 連携設定（公開時に差し替え）
   *   - AIRTABLE_ENDPOINT: 自治体公募用Airtable APIエンドポイント
   *   - AIRTABLE_TOKEN:    Airtable パーソナルアクセストークン
   * 設定方法：環境変数 or Vercel Edge Function 経由でセキュアに渡すこと。
   * デフォルトでは「送信内容を mailto: で開く」フォールバックを用意。
   */
  const AIRTABLE_ENDPOINT = ''; // 例: 'https://api.airtable.com/v0/appXXXX/Submissions'
  const AIRTABLE_TOKEN = '';
  const FALLBACK_MAIL = 'info@metagri-labo.com';

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'form__msg';
      msg.textContent = '';

      // 必須チェック（HTML5 ネイティブ）
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // フォームデータ収集
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
        materials: fd.get('materials') || '',
        useCase: fd.get('useCase')?.trim() || '',
        pastInitiatives: fd.get('past')?.trim() || '',
        approvalFlow: fd.get('approval') || '',
        other: fd.get('other')?.trim() || '',
        submittedAt: new Date().toISOString(),
        source: 'pr-contest-lp / municipality-call',
      };

      // 送信処理
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      try {
        if (AIRTABLE_ENDPOINT && AIRTABLE_TOKEN) {
          // Airtable 直接送信（推奨：実際は Edge Function 経由でトークンを隠す）
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
                Materials: payload.materials,
                UseCase: payload.useCase,
                PastInitiatives: payload.pastInitiatives,
                ApprovalFlow: payload.approvalFlow,
                Other: payload.other,
                SubmittedAt: payload.submittedAt,
                Source: payload.source,
              },
            }),
          });
          if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
        } else {
          // フォールバック：mailto: で開く（実装前の暫定）
          const subject = `【自治体公募フォーム】${payload.organization} ${payload.name}様`;
          const body = formatMailBody(payload);
          const mailto = `mailto:${FALLBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailto;
        }

        // 成功表示
        msg.classList.add('is-success');
        msg.textContent = '送信ありがとうございました。3営業日以内にご連絡いたします。';
        form.reset();
        // フォーカスを成功メッセージへ
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        console.error('[apply] submission failed:', err);
        msg.classList.add('is-error');
        msg.textContent = `送信に失敗しました。お手数ですが ${FALLBACK_MAIL} まで直接ご連絡ください。`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📨 この内容で送信する';
      }
    });
  }

  /**
   * mailto フォールバック用：本文整形
   */
  function formatMailBody(p) {
    return [
      '＝＝＝ 自治体PR動画コンテスト 公募フォーム ＝＝＝',
      '',
      `■ 自治体名・組織名：${p.organization}`,
      `■ ご担当者名　　　：${p.name}`,
      `■ 所属部署　　　　：${p.department || '-'}`,
      `■ メールアドレス　：${p.email}`,
      `■ 電話番号　　　　：${p.tel || '-'}`,
      '',
      `■ 関心テーマ　　　：${p.themes.join(' / ') || '-'}`,
      `■ 想定予算規模　　：${p.budget}`,
      `■ 素材提供可否　　：${p.materials}`,
      '',
      `■ 活用イメージ：`,
      p.useCase,
      '',
      `■ 過去の取組み・課題：`,
      p.pastInitiatives || '-',
      '',
      `■ 決裁フロー　　　：${p.approvalFlow || '-'}`,
      '',
      `■ その他質問・要望：`,
      p.other || '-',
      '',
      '＝＝＝',
      `送信日時：${p.submittedAt}`,
      `送信元　：${p.source}`,
    ].join('\n');
  }
})();

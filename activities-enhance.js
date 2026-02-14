const activityMetaByTitle = {
  'مطابقة صوت الحروف': { icon: '🔊', desc: 'استمع واختر الحرف المطابق.' },
  'مطابقة الحروف الكبيرة والصغيرة': { icon: '🔠', desc: 'طابق بين الحروف الكبيرة والصغيرة.' },
  'مطابقة أصوات الكلمات والمقاطع': { icon: '🎧', desc: 'ميّز أصوات الكلمات والمقاطع.' },
  'بناء الكلمات': { icon: '🧩', desc: 'كوّن الكلمة بالترتيب الصحيح.' },
  'إكمال الكلمة': { icon: '✍️', desc: 'أكمل الحرف أو الكلمة الناقصة.' },
  'مطابقة الكلمات': { icon: '🔗', desc: 'اختر التطابق الصحيح للكلمات.' },
  'أوجد الصوت الأول': { icon: '🎯', desc: 'حدّد الصوت الأول في الكلمة.' },
  'بناء الجمل': { icon: '📝', desc: 'رتّب الكلمات لبناء جملة.' }
};

function enhanceActivityButtons() {
  const container = document.getElementById('activities-container');
  if (!container) return;

  if (!container.className.includes('gap-5')) {
    container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';
  }

  container.querySelectorAll('.activity-btn').forEach((btn) => {
    if (btn.classList.contains('enhanced')) return;

    const titleEl = btn.querySelector('span');
    const title = titleEl ? titleEl.textContent.trim() : btn.textContent.trim();
    const isCompleted = btn.textContent.includes('مكتمل');
    const meta = activityMetaByTitle[title] || { icon: '📘', desc: 'نشاط تدريبي تفاعلي.' };

    btn.classList.add('enhanced');
    btn.classList.remove('p-4', 'rounded-lg', 'text-lg', 'font-semibold', 'shadow-sm', 'bg-white', 'hover:bg-gray-100', 'bg-green-200', 'text-green-800');
    btn.classList.add(isCompleted ? 'activity-btn-complete' : 'activity-btn-default');

    btn.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="text-right">
          <h4 class="text-lg font-bold leading-7">${title}</h4>
          <p class="mt-1 text-sm text-gray-500 font-medium">${meta.desc}</p>
        </div>
        <span class="activity-icon" aria-hidden="true">${meta.icon}</span>
      </div>
      <div class="mt-4 flex items-center justify-between text-sm">
        <span class="activity-chip">${isCompleted ? 'مكتمل ✓' : 'ابدأ الآن'}</span>
        <span class="text-xs ${isCompleted ? 'text-green-700' : 'text-gray-500'}">${isCompleted ? 'تم الإنجاز' : 'نشاط قصير'}</span>
      </div>`;
  });
}

const observer = new MutationObserver(() => enhanceActivityButtons());
observer.observe(document.body, { childList: true, subtree: true });

enhanceActivityButtons();

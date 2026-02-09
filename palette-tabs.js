// ===== パレットタブシステム v1.1 (2026-02-09) =====

// パレットタブを初期化
function initPaletteTabs() {
    const paletteSection = document.querySelector('.column-blocks');
    const paletteTitle = paletteSection.querySelector('.column-title');

    // 既にタブが存在する場合はスキップ
    if (document.querySelector('.palette-tabs')) {
        console.log('Palette tabs already initialized, skipping...');
        return;
    }

    // タブHTMLを作成
    const tabsHTML = `
        <div class="palette-tabs">
            <button class="palette-tab active" data-category="basic">🚀基本・制御</button>
            <button class="palette-tab" data-category="variable">📦箱（変数）</button>
            <button class="palette-tab" data-category="calc">🧪けいさん</button>
            <button class="palette-tab" data-category="action">🎯操作</button>
            <button class="palette-tab" data-category="pen">🖊️ペン</button>
        </div>
    `;

    // タイトルの後に挿入
    paletteTitle.insertAdjacentHTML('afterend', tabsHTML);

    // タブクリックイベントを設定
    const tabs = document.querySelectorAll('.palette-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const category = this.dataset.category;
            switchPaletteCategory(category);

            // アクティブタブを切り替え
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 初期表示（基本カテゴリ）
    switchPaletteCategory('basic');
}

// カテゴリを切り替え
function switchPaletteCategory(category) {
    const blocks = document.querySelectorAll('.block-template');
    const categories = document.querySelectorAll('.palette-category');

    // ブロックの表示切替
    blocks.forEach(block => {
        const blockCategory = block.dataset.category;
        if (blockCategory === category || (category === 'loop' && blockCategory === 'control')) {
            block.style.display = 'block';
        } else {
            block.style.display = 'none';
        }
    });

    // カテゴリヘッダーの表示切替
    categories.forEach(cat => {
        if (cat.dataset.category === category || (category === 'loop' && cat.dataset.category === 'control')) {
            cat.style.display = 'block';
        } else {
            cat.style.display = 'none';
        }
    });
}

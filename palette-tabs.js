// ===== パレットタブシステム v1.0 (2026-02-09) =====

// パレットタブを初期化
function initPaletteTabs() {
    const paletteSection = document.querySelector('.column-blocks');
    const paletteTitle = paletteSection.querySelector('.column-title');
    const gridPalette = document.getElementById('gridPalette');

    // 通常のパレットを非表示にする（既にグリッドパレットがある場合）
    const normalPalette = paletteSection.querySelector('.palette:not(#gridPalette)');
    if (normalPalette) {
        normalPalette.style.display = 'none';
    }

    // 既にタブが存在する場合はスキップ
    if (document.querySelector('.palette-tabs')) {
        console.log('Palette tabs already initialized, skipping...');
        return;
    }

    // タブHTMLを作成
    const tabsHTML = `
        <div class="palette-tabs">
            <button class="palette-tab active" data-category="basic">🚀 基本</button>
            <button class="palette-tab" data-category="variable">📦 変数</button>
            <button class="palette-tab" data-category="control">🔀 制御</button>
        </div>
    `;

    // タイトルの後に挿入
    paletteTitle.insertAdjacentHTML('afterend', tabsHTML);

    // すべてのブロックにカテゴリ属性を追加
    assignBlockCategories();

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

// ブロックにカテゴリを割り当て
function assignBlockCategories() {
    const blocks = document.querySelectorAll('.block-template');

    blocks.forEach(block => {
        const type = block.dataset.type;

        // 基本カテゴリ
        if (['start', 'forward', 'backward', 'right', 'left', 'circle', 'home',
            'penup', 'pendown', 'pensize', 'color', 'fillcell', 'clear',
            'loop_start', 'loop_end', 'template'].includes(type)) {
            block.dataset.category = 'basic';
        }
        // 変数カテゴリ
        else if (['var_create', 'var_set', 'array_create', 'array_set'].includes(type)) {
            block.dataset.category = 'variable';
        }
        // 制御カテゴリ
        else if (['if_start', 'else_start', 'if_end', 'grid_get', 'grid_set'].includes(type)) {
            block.dataset.category = 'control';
        }
        // デフォルトは基本
        else {
            block.dataset.category = 'basic';
        }
    });
}

// カテゴリを切り替え
function switchPaletteCategory(category) {
    const blocks = document.querySelectorAll('.block-template');
    const categories = document.querySelectorAll('.palette-category');

    blocks.forEach(block => {
        const blockCategory = block.dataset.category;
        if (blockCategory === category) {
            block.style.display = 'block';
        } else {
            block.style.display = 'none';
        }
    });

    // カテゴリヘッダーも表示/非表示
    categories.forEach(cat => {
        cat.style.display = 'none';
    });
}

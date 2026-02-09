// ===== メインアプリケーションロジック v1.1 (2026-02-06) =====

let programBlocks = [];
let sortableProgram = null;
let sortablePalette = null;

// データバージョン管理
const DATA_VERSION = '1.0';
const MAX_BLOCKS = 200; // ブロック数上限

// ファミコン52パレット (Peconet参照)
const FAMICOM_COLORS = [
    "#7c7c7c", "#0000fc", "#0000bc", "#4428bc", "#940084", "#a80020", "#a81000", "#881400", "#503000", "#007800", "#006800", "#0058f8", "#004058",
    "#bcbcbc", "#0078f8", "#0058f8", "#6844fc", "#d800cc", "#e40058", "#f83800", "#e45c10", "#ac7c00", "#00b800", "#00a844", "#008888", "#000000",
    "#f8f8f8", "#3cbcfc", "#6888fc", "#9878f8", "#f878f8", "#f85898", "#f87858", "#fca044", "#f8b800", "#b8f818", "#58d854", "#58f898", "#00e8d8", "#787878",
    "#fcfcfc", "#a4e4fc", "#b8b8f8", "#d8b8f8", "#f8b8f8", "#f8a4c0", "#f0d0b0", "#fce0a8", "#f8d878", "#d8f878", "#b8f8b8", "#b8f8b8", "#00fcfc", "#f8d8f8"
];

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed. Initializing...');

    const tasks = [
        { name: 'VariableSystem', func: initVariableSystem },
        { name: 'ChallengeSystem', func: initChallengeSystem },
        { name: 'PaletteTabs', func: initPaletteTabs },
        { name: 'TutorialSystem', func: initTutorialSystem },
        { name: 'Sortable', func: initUnifiedSortable },
        { name: 'EventListeners', func: initEventListeners },
        { name: 'TurtleSimulator', func: initTurtleSimulator },
        { name: 'ProgramTabs', func: initProgramTabs },
        { name: 'GlobalSpeed', func: syncGlobalSpeed },
        { name: 'InitialBlock', func: addInitialBlock },
        { name: 'TutorialListeners', func: initTutorialListeners },
        { name: 'ChallengeListeners', func: initChallengeListeners },
        { name: 'GridMode', func: enableGridMode },
        { name: 'FirstVisitCheck', func: () => setTimeout(checkFirstVisit, 500) }
    ];

    tasks.forEach(task => {
        try {
            task.func();
            console.log(`Initialization task [${task.name}] success.`);
        } catch (e) {
            console.error(`Initialization task [${task.name}] failed:`, e);
        }
    });

    console.log('Initialization sequence completed.');
});

// 初期ブロック（プログラム開始）を配置する
function addInitialBlock() {
    const programArea = document.getElementById('programArea');
    if (programArea.querySelectorAll('.program-block').length === 0) {
        addBlockProgrammatically('start');
        updatePreviewIfPossible();
    }
}

// SortableJS を使った統合ドラッグ＆ドロップの初期化
function initUnifiedSortable() {
    const gridPalette = document.getElementById('gridPalette');
    const programArea = document.getElementById('programArea');

    if (!gridPalette) return;

    // 既存のSortableを破棄
    if (gridPalette._sortable) {
        gridPalette._sortable.destroy();
    }

    // パレット内のブロックをクリックでも追加できるようにする
    gridPalette.onclick = function (e) {
        // selectやinputをクリックした場合は、リストの変更を優先させるため追加しない
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
            return;
        }

        const target = e.target.closest('.block-template');
        if (target && gridPalette.contains(target)) {
            const clone = target.cloneNode(true);
            programArea.appendChild(clone);
            setupNewBlock(clone);
            updatePreviewIfPossible();
        }
    };

    // パレット側：ここからプログラムエリアへクローン（複製）できるようにする
    gridPalette._sortable = new Sortable(gridPalette, {
        group: {
            name: 'blocks',
            pull: 'clone',
            put: false
        },
        sort: false,
        draggable: '.block-template',
        animation: 150
    });

    // プログラムエリア側：受け入れと並び替えの両方を担当
    if (sortableProgram) {
        sortableProgram.destroy();
    }
    sortableProgram = new Sortable(programArea, {
        group: {
            name: 'blocks',
            put: true
        },
        animation: 150,
        ghostClass: 'dragging',
        draggable: '.block-template, .program-block',
        onAdd: function (evt) {
            const itemEl = evt.item;
            setupNewBlock(itemEl);
            updatePreviewIfPossible();
        },
        onEnd: function () {
            updatePreviewIfPossible();
        }
    });
}

// 新しく追加されたブロックのセットアップ
function setupNewBlock(el) {
    const type = el.dataset.type;

    // ブロック数上限チェック
    const programArea = document.getElementById('programArea');
    const currentBlockCount = programArea.querySelectorAll('.program-block').length;

    if (currentBlockCount >= MAX_BLOCKS) {
        el.remove();
        showConsoleMessage(`⚠️ ブロック数の上限（${MAX_BLOCKS}個）に達しました！`, 'error');
        return;
    }

    // テンプレート展開の場合
    if (type === 'template') {
        const algorithm = JSON.parse(el.dataset.algorithm || '[]');
        el.remove(); // テンプレートブロック自身は消す

        // テンプレート展開時も上限チェック
        if (currentBlockCount + algorithm.length > MAX_BLOCKS) {
            showConsoleMessage(`⚠️ テンプレート展開後のブロック数が上限を超えます！`, 'error');
            return;
        }

        algorithm.forEach(step => {
            addBlockProgrammatically(step.type, step.val);
        });
        checkEmptyHint();
        return;
    }

    el.classList.remove('block-template');
    el.classList.add('program-block');
    // ...
    // 入力パラメータの初期値取得
    const params = {};
    const controls = el.querySelectorAll('select, input');
    controls.forEach(control => {
        params[control.dataset.param] = control.value;
    });
    el.dataset.params = JSON.stringify(params);

    // ブロックの内容コンテナを構築
    const content = el.innerHTML;
    el.innerHTML = '';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'block-content';
    contentSpan.innerHTML = content;

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = function (e) {
        e.stopPropagation();
        el.remove();
        checkEmptyHint();
        updatePreviewIfPossible();
    };

    el.appendChild(contentSpan);
    el.appendChild(deleteBtn);

    // フォーム要素のイベント監視
    const programControls = el.querySelectorAll('select, input');
    programControls.forEach(control => {
        const paramName = control.dataset.param;
        if (params[paramName]) control.value = params[paramName];

        const eventType = control.tagName === 'SELECT' ? 'change' : 'input';
        control.addEventListener(eventType, function () {
            const currentParams = JSON.parse(el.dataset.params);
            currentParams[paramName] = this.value;
            el.dataset.params = JSON.stringify(currentParams);
            updatePreviewIfPossible();
        });
    });

    // カラーパレットの生成 (colorブロックのみ)
    if (type === 'color') {
        const grid = el.querySelector('.color-palette-grid');
        const colorInput = el.querySelector('input[type="color"]');
        const mainRow = el.querySelector('.block-main-row');

        if (mainRow && grid) {
            mainRow.onclick = function (e) {
                // input[type="color"] 自体がクリックされた場合はトグルしない
                if (e.target.tagName === 'INPUT') return;

                e.stopPropagation();
                grid.classList.toggle('show');
            };
        }

        if (grid && colorInput) {
            FAMICOM_COLORS.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.onclick = function (e) {
                    e.stopPropagation();
                    colorInput.value = color;
                    // パラメータ更新
                    const currentParams = JSON.parse(el.dataset.params);
                    currentParams['color'] = color;
                    el.dataset.params = JSON.stringify(currentParams);
                    updatePreviewIfPossible();
                };
                grid.appendChild(swatch);
            });
        }
    }

    const hint = document.querySelector('.drop-hint');
    if (hint) hint.remove();
}

// 指定したタイプと値でブロックをプログラム的に追加する
function addBlockProgrammatically(type, values) {
    const gridPalette = document.getElementById('gridPalette');
    const sourceTemplate = gridPalette ? gridPalette.querySelector(`.block-template[data-type="${type}"]`) : null;

    if (!sourceTemplate) return;

    const clone = sourceTemplate.cloneNode(true);
    const programArea = document.getElementById('programArea');
    programArea.appendChild(clone);

    // 値をセット
    if (values) {
        const controls = clone.querySelectorAll('select, input');
        controls.forEach(control => {
            const param = control.dataset.param;
            if (values[param]) control.value = values[param];
        });
    }

    setupNewBlock(clone);
}

// プログラムが空かチェックしてヒントを出す
function checkEmptyHint() {
    const programArea = document.getElementById('programArea');
    if (programArea.querySelectorAll('.program-block').length === 0) {
        programArea.innerHTML = '<p class="drop-hint">← ブロックをドラッグして並べてね！<br>入れた後は上下に入れ替えられるのだ！</p>';
    }
}

// プレビューの自動更新
function updatePreviewIfPossible() {
    updateProgramBlocks();
    const code = generatePythonCode();
    const codePreview = document.getElementById('codePreview');
    if (code) {
        codePreview.textContent = code;
        Prism.highlightElement(codePreview);
    } else {
        codePreview.textContent = '# RUNボタンを押すと生成されるのだ！';
    }
}

// 速度スライダーとの同期
function syncGlobalSpeed() {
    const speedSlider = document.getElementById('globalSpeed');
    if (speedSlider) {
        speedSlider.addEventListener('input', function () {
            if (turtleSim) {
                turtleSim.setSpeed(parseInt(this.value));
            }
        });
        // 初期値反映
        if (turtleSim) turtleSim.setSpeed(parseInt(speedSlider.value));
    }
}

// プログラムブロックの配列を最新化
function updateProgramBlocks() {
    const programArea = document.getElementById('programArea');
    const blocks = programArea.querySelectorAll('.program-block');
    programBlocks = Array.from(blocks).map(block => ({
        type: block.dataset.type,
        code: block.dataset.code,
        params: JSON.parse(block.dataset.params || '{}'),
        element: block
    }));

    // インデントの視覚的表現（ループ内）
    let depth = 0;
    programBlocks.forEach(b => {
        b.element.classList.remove('indented-1', 'indented-2', 'indented-3');
        if (b.type === 'loop_end') depth = Math.max(0, depth - 1);
        if (depth > 0) {
            const indentClass = 'indented-' + Math.min(depth, 3);
            b.element.classList.add(indentClass);
        }
        if (b.type === 'loop_start') depth++;
    });
}

// イベントリスナー
function initEventListeners() {
    document.getElementById('runBtn').addEventListener('click', runProgram);
    document.getElementById('resetBtn').addEventListener('click', resetProgram);
    document.getElementById('saveBtn').addEventListener('click', saveToLocalStorage);
    document.getElementById('loadBtn').addEventListener('click', loadFromLocalStorage);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllBlocks);
    document.getElementById('exportBtn').addEventListener('click', exportToFile);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importFromFile);
}

// Pythonコード生成ロジック
function generatePythonCode() {
    if (programBlocks.length === 0) return null;

    let code = '';
    let indentLevel = 0;
    const indent = '    ';

    for (const block of programBlocks) {
        let line = block.code;

        // パラメータ置換
        for (const [key, value] of Object.entries(block.params)) {
            line = line.replace('{' + key + '}', value);
        }

        if (block.type === 'loop_end') {
            indentLevel = Math.max(0, indentLevel - 1);
            code += indent.repeat(indentLevel) + '# ループここまで\n';
            continue;
        }

        // マルチライン対応：各行にインデントを適用
        const blockLines = line.split('\n');
        for (const bl of blockLines) {
            code += indent.repeat(indentLevel) + bl + '\n';
        }

        if (block.type === 'loop_start') {
            indentLevel++;
        }
    }

    return code;
}

// 実行
async function runProgram() {
    const runBtn = document.getElementById('runBtn');
    try {
        // エラーハイライトをクリア
        clearErrorHighlight();

        runBtn.disabled = true;
        runBtn.textContent = '⏳...';

        updateProgramBlocks();
        if (programBlocks.length === 0) {
            showConsoleMessage('ブロックを置いてからRUNなのだ！🧩', 'error');
            return;
        }

        const hasStart = programBlocks.some(b => b.type === 'start');
        if (!hasStart) {
            showConsoleMessage('「🚀 プログラム開始」ブロックを最初に置いてね！', 'error');
            return;
        }

        const code = generatePythonCode();
        showConsoleMessage('プログラムを実行中... 🏃', 'info');
        await executeTurtleCommands(code);

    } catch (error) {
        showConsoleMessage('エラー: ' + error.message, 'error');
        // エラーが発生したブロックをハイライト
        highlightErrorBlock();
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ RUN';
    }
}

// エラーブロックのハイライト表示
function highlightErrorBlock() {
    if (turtleSim && turtleSim.errorBlockIndex !== undefined) {
        const blocks = document.querySelectorAll('.program-block');
        if (blocks[turtleSim.errorBlockIndex]) {
            blocks[turtleSim.errorBlockIndex].classList.add('error-block');
            // 3秒後にハイライトを解除
            setTimeout(() => {
                blocks[turtleSim.errorBlockIndex].classList.remove('error-block');
            }, 3000);
        }
    }
}

// エラーハイライトをクリア
function clearErrorHighlight() {
    document.querySelectorAll('.error-block').forEach(block => {
        block.classList.remove('error-block');
    });
    if (turtleSim) {
        turtleSim.errorBlockIndex = undefined;
    }
}

// リセット
function resetProgram() {
    if (turtleSim) turtleSim.reset();
    if (variableSystem) variableSystem.reset();

    // プログラムエリアをクリアして初期ブロックを再配置
    const programArea = document.getElementById('programArea');
    programArea.innerHTML = '';
    addInitialBlock();
    updatePreviewIfPossible();

    showConsoleMessage('リセット完了！✨', 'success');
}

// プログラム全削除（確認ダイアログ付き）
function clearAllBlocks() {
    const confirmed = confirm('プログラムを全て削除しますか？\n（この操作は取り消せません）');

    if (confirmed) {
        const programArea = document.getElementById('programArea');
        programArea.innerHTML = '';
        if (variableSystem) variableSystem.reset();
        addInitialBlock();
        updatePreviewIfPossible();
        showConsoleMessage('プログラムをクリアしました！🗑️', 'success');
    }
}

// グリッドモードを常に有効化
function enableGridMode() {
    if (!turtleSim) return;

    // 常にグリッドモードを有効化
    const gridSizeSelect = document.getElementById('gridSize');
    const gridSize = gridSizeSelect ? parseInt(gridSizeSelect.value) : 8;
    turtleSim.setGridMode(true, gridSize);

    // グリッドサイズ変更のリスナー
    if (gridSizeSelect) {
        gridSizeSelect.addEventListener('change', function () {
            const newSize = parseInt(this.value);
            turtleSim.setGridMode(true, newSize);
            showConsoleMessage(`グリッドサイズを ${newSize}x${newSize} に変更しました。`, 'info');
        });
    }
}


// プログラムタブの切り替え
function initProgramTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;
            if (!targetTab) return; // タブ切り替え用ではないボタンは無視

            // すべてのタブボタンとコンテンツから active を削除
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // クリックされたタブをアクティブに
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + 'Tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // コードタブに切り替えた時はコードを更新
            if (targetTab === 'code') {
                updatePreviewIfPossible();
            }
        });
    });
}

// --- 保存・入出力機能 ---

// LocalStorageに保存（バージョン情報付き）
function saveToLocalStorage() {
    updateProgramBlocks();
    // DOM要素(element)を除外してシリアライザブルな形式にする
    const serializable = programBlocks.map(b => ({
        type: b.type,
        params: b.params
    }));

    const dataWithVersion = {
        version: DATA_VERSION,
        timestamp: new Date().toISOString(),
        blocks: serializable
    };

    const data = JSON.stringify(dataWithVersion);
    localStorage.setItem('turtle_program', data);
    showConsoleMessage('ブラウザに保存したのだ！💾', 'success');
}

// LocalStorageから読込（バージョン互換性チェック付き）
function loadFromLocalStorage() {
    const data = localStorage.getItem('turtle_program');
    if (!data) {
        showConsoleMessage('保存されたデータがないのだ！📂', 'error');
        return;
    }

    try {
        const parsed = JSON.parse(data);
        let blocks;

        // バージョン情報がある場合
        if (parsed.version) {
            if (parsed.version !== DATA_VERSION) {
                console.warn(`データバージョンが異なります: ${parsed.version} -> ${DATA_VERSION}`);
                // 将来的なバージョン変換処理をここに追加
            }
            blocks = parsed.blocks;
        } else {
            // 旧形式（バージョン情報なし）の場合
            blocks = parsed;
        }

        reconstructProgram(blocks);
        showConsoleMessage('保存データを読み込んだのだ！✨', 'success');
    } catch (error) {
        showConsoleMessage('データの読み込みに失敗したのだ...🚫', 'error');
        console.error('Load error:', error);
    }
}

// ファイルに出力 (JSON) - バージョン情報付き
function exportToFile() {
    updateProgramBlocks();
    const serializable = programBlocks.map(b => ({
        type: b.type,
        params: b.params
    }));

    const dataWithVersion = {
        version: DATA_VERSION,
        timestamp: new Date().toISOString(),
        blocks: serializable
    };

    const data = JSON.stringify(dataWithVersion, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `turtle_program_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showConsoleMessage('ファイルに書き出したのだ！📤', 'success');
}

// ファイルから入力（バージョン互換性チェック付き）
function importFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            let blocks;

            // バージョン情報がある場合
            if (parsed.version) {
                if (parsed.version !== DATA_VERSION) {
                    console.warn(`データバージョンが異なります: ${parsed.version} -> ${DATA_VERSION}`);
                    // 将来的なバージョン変換処理をここに追加
                }
                blocks = parsed.blocks;
            } else {
                // 旧形式（バージョン情報なし）の場合
                blocks = parsed;
            }

            reconstructProgram(blocks);
            showConsoleMessage('ファイルから読み込んだのだ！📥', 'success');
        } catch (err) {
            showConsoleMessage('ファイルの読み込みに失敗したのだ...🚫', 'error');
            console.error('Import error:', err);
        }
    };
    reader.readAsText(file);
    // 同じファイルを再度選択できるようにリセット
    e.target.value = '';
}

// ブロック配列からプログラムエリアを再構築
function reconstructProgram(blocks) {
    const programArea = document.getElementById('programArea');
    programArea.innerHTML = '';

    blocks.forEach(blockData => {
        addBlockProgrammatically(blockData.type, blockData.params);
    });

    if (blocks.length === 0) {
        addInitialBlock();
    }

    updatePreviewIfPossible();
}

// ===== チュートリアル機能 =====

// 初回訪問チェック
function checkFirstVisit() {
    const hasVisited = localStorage.getItem('turtle_tutorial_completed');
    if (!hasVisited) {
        showTutorial();
    }
}

// チュートリアル表示
function showTutorial() {
    const modal = document.getElementById('tutorialModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// チュートリアル閉じる
function closeTutorial() {
    const dontShow = document.getElementById('dontShowAgain').checked;
    if (dontShow) {
        localStorage.setItem('turtle_tutorial_completed', 'true');
    }
    document.getElementById('tutorialModal').style.display = 'none';
}

// チュートリアルイベントリスナー
function initTutorialListeners() {
    const closeBtn = document.getElementById('closeTutorial');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTutorial);
    }
}


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

    // パレット内のブロックをクリックでも追加できるようにする
    const paletteItems = document.querySelectorAll('.block-template');
    paletteItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.title = 'クリックまたはドラッグで追加';
        item.addEventListener('click', function (e) {
            // selectやinputをクリックした場合は、数値を変更したいだけなので追加しない
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                return;
            }

            const clone = this.cloneNode(true);
            const targetContainer = document.getElementById('programArea');
            if (targetContainer) {
                targetContainer.appendChild(clone);
                setupNewBlock(clone);
                updatePreviewIfPossible();

                // 視覚的なフィードバック (フラッシュ)
                this.style.opacity = '0.5';
                setTimeout(() => this.style.opacity = '1', 100);
            }
        });
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

    // 自動セット配置機能（ループ、条件分岐）
    if (type === 'loop_start') {
        setTimeout(() => addBlockProgrammatically('loop_end'), 50);
    } else if (type === 'while_start' || type === 'while_cell') {
        setTimeout(() => addBlockProgrammatically('loop_end'), 50);
    } else if (type === 'if_start') {
        setTimeout(() => addBlockProgrammatically('if_end'), 50);
    }
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
            // 数値入力欄は全角→半角に自動変換
            if (control.tagName === 'INPUT' && control.type !== 'color') {
                const pos = this.selectionStart;
                this.value = this.value.replace(/[０-９．－＋]/g, c =>
                    String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
                try { this.setSelectionRange(pos, pos); } catch (e) { }
            }
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
    const slider = document.getElementById('speed');
    if (slider) {
        // 初期値を9(0.05s)に設定
        slider.value = 9;
        updateSpeedDisplay(slider.value);

        // turtleSimの速度を初期反映（スライダー値を直接渡す）
        if (turtleSim) {
            turtleSim.setSpeed(parseInt(slider.value));
        }

        // スライダーの変更イベントリスナー
        slider.addEventListener('input', function () {
            const val = parseInt(this.value);
            updateSpeedDisplay(val);
            if (turtleSim) {
                turtleSim.setSpeed(val); // スライダー位置(0-10)を直接渡す
            }
        });
    }
}

// プログラムブロックの配列を最新化
function updateProgramBlocks() {
    const programArea = document.getElementById('programArea');
    const blocks = programArea.querySelectorAll('.program-block');
    programBlocks = Array.from(blocks).map(block => {
        const params = JSON.parse(block.dataset.params || '{}');

        // input要素から値を取得してparamsに追加
        const inputs = block.querySelectorAll('.block-input');
        inputs.forEach(input => {
            const paramName = input.dataset.param;
            if (paramName) {
                params[paramName] = input.value;
            }
        });

        // select要素からも値を取得（既存の処理を維持）
        const selects = block.querySelectorAll('.block-select');
        selects.forEach(select => {
            const paramName = select.dataset.param;
            if (paramName) {
                params[paramName] = select.value;
            }
        });

        return {
            type: block.dataset.type,
            code: block.dataset.code,
            params: params,
            element: block
        };
    });

    // 行数を更新
    const lineCountDisplay = document.getElementById('lineCount');
    if (lineCountDisplay) {
        lineCountDisplay.textContent = programBlocks.length;
    }

    // インデントの視覚的表現（ループ・条件分岐内）
    let depth = 0;
    programBlocks.forEach(b => {
        b.element.classList.remove('indented-1', 'indented-2', 'indented-3');

        // 閉じるブロックまたは継続ブロックで深度を下げる
        if (b.type === 'loop_end' || b.type === 'if_end' || b.type === 'else_start') {
            depth = Math.max(0, depth - 1);
        }

        if (depth > 0) {
            const indentClass = 'indented-' + Math.min(depth, 3);
            b.element.classList.add(indentClass);
        }

        // 開始ブロックまたは継続ブロックで深度を上げる
        if (b.type === 'loop_start' || b.type === 'if_start' || b.type === 'else_start' || b.type === 'while_start') {
            depth++;
        }
    });
}

// イベントリスナー
function initEventListeners() {
    document.getElementById('runBtn').addEventListener('click', runProgram);
    document.getElementById('pauseBtn').addEventListener('click', pauseProgram);
    document.getElementById('stopBtn').addEventListener('click', stopProgram);
    document.getElementById('stepBackBtn').addEventListener('click', stepBack);
    document.getElementById('stepForwardBtn').addEventListener('click', stepForward);
    document.getElementById('resetBtn').addEventListener('click', resetProgram);
    document.getElementById('saveBtn').addEventListener('click', () => { closeDataMenu(); saveToLocalStorage(); });
    document.getElementById('loadBtn').addEventListener('click', () => { closeDataMenu(); loadFromLocalStorage(); });
    document.getElementById('clearAllBtn').addEventListener('click', clearAllBlocks);
    document.getElementById('exportBtn').addEventListener('click', () => { closeDataMenu(); exportToFile(); });
    document.getElementById('importBtn').addEventListener('click', () => { closeDataMenu(); document.getElementById('importFile').click(); });
    document.getElementById('importFile').addEventListener('change', importFromFile);

    // データドロップダウン
    document.getElementById('dataBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('dataMenu').classList.toggle('open');
    });
    document.addEventListener('click', closeDataMenu);
}

function closeDataMenu() {
    const menu = document.getElementById('dataMenu');
    if (menu) menu.classList.remove('open');
}

// 実行管理フラグ
let isStepping = false;
let currentStepIndex = 0; // 「何番目の実行コマンドまで表示するか」（0=初期状態）

async function stopProgram() {
    if (turtleSim) {
        turtleSim.breakFlag = true;
        isStepping = false;
        currentStepIndex = 0;
        showConsoleMessage('プログラムを停止しました。', 'info');
    }
}

// 一時停止：実行中断し、現在の実行ステップ数から手動ステップ操作に切り替える
async function pauseProgram() {
    if (turtleSim && turtleSim.isRunning) {
        turtleSim.breakFlag = true;
        // 現在の実行ステップ数を保存（「次へ」「戻る」の起点として使う）
        currentStepIndex = turtleSim.stepCount;
        isStepping = true;
        showConsoleMessage(`⏸ ${currentStepIndex} ステップ目で一時停止。「戻る」「進む」で確認できます。`, 'info');
    } else {
        showConsoleMessage('実行中のみ一時停止できます。', 'info');
    }
}

// currentStepIndex: 「何番目の実行コマンドまで表示するか」（0始まり、-1=初期状態）
// ループ内でも1実行ずつ進む

async function stepForward() {
    if (turtleSim && turtleSim.isRunning) {
        return;
    }

    isStepping = true;
    updateProgramBlocks();

    // 1実行進める
    currentStepIndex++;

    // リセット＆高速リプレイで正確な状態を再現する
    const savedSpeed = turtleSim.speed;
    turtleSim.reset(); // breakFlag もリセット（speedは変わらない）
    if (variableSystem) variableSystem.reset();

    turtleSim.speed = 0; // 即時リプレイ
    const code = generatePythonCode();
    await executeTurtleCommandsAtStep(code, currentStepIndex);

    // 実行が終わってみて、実際に何ステップ実行されたか確認
    const actualSteps = turtleSim.stepCount;
    if (actualSteps < currentStepIndex) {
        // プログラム終端を超えていた場合は末尾に戻す
        currentStepIndex = actualSteps;
        showConsoleMessage('最後の手順なのだ！', 'info');
    } else {
        showConsoleMessage(`▶ ステップ ${currentStepIndex} を実行したのだ！`, 'info');
    }

    turtleSim.speed = savedSpeed;
}

async function stepBack() {
    if (currentStepIndex <= 0) {
        const savedSpeed = turtleSim.speed;
        turtleSim.reset();
        if (variableSystem) variableSystem.reset();
        turtleSim.speed = savedSpeed;
        currentStepIndex = 0;
        clearActiveHighlights();
        showConsoleMessage('最初の位置に戻ったのだ！', 'info');
        return;
    }

    currentStepIndex--;
    // 「戻る」は「リセット + currentStepIndex回まで高速再実行」で実現
    const savedSpeed = turtleSim.speed;
    turtleSim.reset(); // breakFlag もリセット
    if (variableSystem) variableSystem.reset();

    turtleSim.speed = 0;
    const code = generatePythonCode();
    await executeTurtleCommandsAtStep(code, currentStepIndex);

    turtleSim.speed = savedSpeed;

    if (currentStepIndex <= 0) {
        clearActiveHighlights();
        showConsoleMessage('最初の位置に戻ったのだ！', 'info');
    }
}

function generatePythonCodeAtStep(stepIndex) {
    // 実際には全コードを生成するが、実行側で制御するために全コードを返す
    return generatePythonCode();
}

async function executeTurtleCommandsAtStep(code, stepIndex) {
    if (!turtleSim) initTurtleSimulator();

    // 課題データの復元などは executeTurtleCommands に準ずる
    if (typeof challengeSystem !== 'undefined' && challengeSystem && challengeSystem.challengeActive) {
        challengeSystem.loadGridData(challengeSystem.currentChallenge.initialGrid);
    }

    try {
        // turtle-simulator.js に定義した関数を呼び出す
        if (typeof executeManualStep === 'function') {
            await executeManualStep(code, stepIndex);
        } else {
            // 万が一関数が公開されていない場合（グローバルでない場合）のフォールバック
            console.error('executeManualStep is not defined');
        }
    } catch (e) {
        showConsoleMessage(`Error: ${e.message}`, 'error');
    }
}

// Pythonコード生成ロジック
function generatePythonCode() {
    if (programBlocks.length === 0) return null;

    let code = '';
    let indentLevel = 0;
    const indent = '    ';

    programBlocks.forEach((block, index) => {
        let line = block.code;

        // パラメータ置換
        for (const [key, value] of Object.entries(block.params)) {
            line = line.replace('{' + key + '}', value);
        }

        const meta = `  # @idx:${index}`;

        if (block.type === 'loop_end' || block.type === 'if_end') {
            indentLevel = Math.max(0, indentLevel - 1);
            const comment = block.type === 'loop_end' ? '# ループここまで' : '# 条件分岐ここまで';
            code += indent.repeat(indentLevel) + comment + meta + '\n';
            return;
        }

        if (block.type === 'else_start') {
            indentLevel = Math.max(0, indentLevel - 1);
            code += indent.repeat(indentLevel) + 'else:' + meta + '\n';
            indentLevel++;
            return;
        }

        // マルチライン対応：各行にインデントとメタデータを適用
        const blockLines = line.split('\n');
        for (const bl of blockLines) {
            code += indent.repeat(indentLevel) + bl + meta + '\n';
        }

        if (block.type === 'loop_start' || block.type === 'if_start' || block.type === 'while_start') {
            indentLevel++;
        }
    });

    return code;
}

// 実行
async function runProgram() {
    const runBtn = document.getElementById('runBtn');
    try {
        // エラーハイライトをクリア
        clearErrorHighlight();

        // ステップ実行状態をリセット
        isStepping = false;
        currentStepIndex = 0;

        runBtn.disabled = true;
        runBtn.textContent = '⏳...';

        updateProgramBlocks();
        if (programBlocks.length === 0) {
            showConsoleMessage('ブロックを置いてからRUNなのだ！🧩', 'error');
            return;
        }

        clearActiveHighlights(); // 実行前にクリア
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
        // 実行終了後にハイライトを消さない（どこで止まったか見せるため）
        // または数秒後に消す場合はここでタイマー
    }
}

// 実行中のブロックを強調表示
function highlightActiveBlock(index) {
    const blocks = document.querySelectorAll('.program-block');
    blocks.forEach((block, idx) => {
        if (idx === index) {
            block.classList.add('active-block');
            // スムーズにスクロール
            block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            block.classList.remove('active-block');
        }
    });
}

// ハイライトを全てクリア
function clearActiveHighlights() {
    document.querySelectorAll('.active-block').forEach(block => {
        block.classList.remove('active-block');
    });
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
    clearActiveHighlights();
    isStepping = false;
    currentStepIndex = 0;

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

    // 常に10x10グリッドモードを有効化
    const gridSize = 10;
    turtleSim.setGridMode(true, gridSize);
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
    const hasVisited = localStorage.getItem('python_turtle_welcome_dismissed');
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
function closeWelcomeModal() {
    const dontShow = document.getElementById('dontShowAgain').checked;
    if (dontShow) {
        localStorage.setItem('python_turtle_welcome_dismissed', 'true');
    }
    document.getElementById('tutorialModal').style.display = 'none';
}


// 保存・読み込み（ファイルベース）
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const programNameInput = document.getElementById('programName');

if (exportBtn) {
    exportBtn.addEventListener('click', exportProgram);
}

if (importBtn) {
    importBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', importProgram);
}

// チュートリアルイベントリスナー
function initTutorialListeners() {
    const closeBtn = document.getElementById('welcomeModalCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeWelcomeModal);
    }
}

// 速度表示の更新
function updateSpeedDisplay(val) {
    const display = document.getElementById('speedValueDisplay');
    if (!display) return;

    let sec;
    if (val <= 7) {
        sec = (1.6 - val * 0.2).toFixed(1);
    } else if (val === 8) {
        sec = "0.1";
    } else if (val === 9) {
        sec = "0.05";
    } else {
        sec = "0.01";
    }
    display.textContent = `(${sec}s)`;
}

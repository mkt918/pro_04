// ===== タートルシミュレーター v1.1 (2026-02-06) =====

class TurtleSimulator {
    constructor(canvasId, spriteCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.spriteCanvas = document.getElementById(spriteCanvasId);
        this.spriteCtx = this.spriteCanvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // エラーブロックインデックス
        this.errorBlockIndex = undefined;
        this.currentBlockIndex = 0;

        // グリッドモードをデフォルトで有効化
        this.gridMode = true;
        this.gridSize = 8;

        // マス目データ管理（各セルに値を保存）
        this.gridData = [];
        this.initGridData();

        // タートルの初期状態
        this.reset();

        // 記憶用 (名前付き座標保存)
        this.savedPos = new Map();

        // 実行制御フラグ
        this.breakFlag = false;
        this.hasError = false;
    }

    async wait(seconds) {
        await this.sleep(seconds * 1000);
    }

    savePos(name = 'default') {
        this.savedPos.set(name, {
            x: this.x,
            y: this.y,
            angle: this.angle
        });
    }

    async restorePos(name = 'default') {
        const pos = this.savedPos.get(name);
        if (!pos) return;

        if (this.gridMode) {
            await this.animateCellMove(pos.x, pos.y);
        } else {
            await this.animateMove(pos.x, pos.y);
        }
        this.angle = pos.angle;
        this.drawTurtle();
    }

    async restart() {
        await this.home();
    }

    initGridData() {
        // グリッドサイズに応じて2次元配列を初期化
        this.gridData = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.gridData[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.gridData[i][j] = 0; // 初期値は0
            }
        }
    }

    reset() {
        // メインキャンバス（描画用）をクリア
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // スプライトキャンバス（タートル表示用）をクリア
        this.spriteCtx.clearRect(0, 0, this.width, this.height);

        // グリッドモードの場合はグリッドを描画
        if (this.gridMode) {
            this.drawGrid();
        }

        // タートルの状態を初期化
        if (this.gridMode) {
            // グリッドモード：左上のセル(A1)に配置
            const cellSize = Math.min(this.width, this.height) / this.gridSize;
            const offsetX = (this.width - cellSize * this.gridSize) / 2;
            const offsetY = (this.height - cellSize * this.gridSize) / 2;
            this.x = offsetX + cellSize / 2;
            this.y = offsetY + cellSize / 2;
        } else {
            this.x = this.width / 2;
            this.y = this.height / 2;
        }
        this.angle = this.gridMode ? 0 : 0;  // グリッドモードは右向き(0度)、通常モードも0度
        this.penDown = this.gridMode ? false : true; // グリッドモードは上げ、通常モードは下げ
        this.color = 'black';
        this.speed = 5;
        this.lineWidth = 2;
        this.isRunning = false;
        this.hasError = false;

        // タートルを描画
        this.drawTurtle();
    }

    setGridMode(enabled, size = 8) {
        this.gridMode = enabled;
        this.gridSize = size;
        this.initGridData(); // マス目データを再初期化
        this.reset();
    }

    drawGrid() {
        const cellSize = Math.min(this.width, this.height) / this.gridSize;
        const offsetX = (this.width - cellSize * this.gridSize) / 2;
        const offsetY = (this.height - cellSize * this.gridSize) / 2;

        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;

        // 縦線
        for (let i = 0; i <= this.gridSize; i++) {
            const x = offsetX + i * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, offsetY);
            this.ctx.lineTo(x, offsetY + this.gridSize * cellSize);
            this.ctx.stroke();
        }

        // 横線
        for (let i = 0; i <= this.gridSize; i++) {
            const y = offsetY + i * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, y);
            this.ctx.lineTo(offsetX + this.gridSize * cellSize, y);
            this.ctx.stroke();
        }
    }

    drawTurtle() {
        this.spriteCtx.save();

        if (this.gridMode) {
            // グリッドモード：現在のセルを赤い枠で囲む
            const cellSize = Math.min(this.width, this.height) / this.gridSize;

            this.spriteCtx.strokeStyle = '#FF0000';
            this.spriteCtx.lineWidth = 4;
            this.spriteCtx.lineJoin = 'round';

            // セルの外形を描画
            const rectX = this.x - cellSize / 2;
            const rectY = this.y - cellSize / 2;
            this.spriteCtx.strokeRect(rectX + 2, rectY + 2, cellSize - 4, cellSize - 4);

        } else {
            // 通常モード：赤い矢印
            const size = 15;
            this.spriteCtx.translate(this.x, this.y);
            this.spriteCtx.rotate(this.angle * Math.PI / 180);

            this.spriteCtx.fillStyle = '#FF0000';
            this.spriteCtx.strokeStyle = '#B30000';
            this.spriteCtx.lineWidth = 2;

            this.spriteCtx.beginPath();
            this.spriteCtx.moveTo(size, 0);
            this.spriteCtx.lineTo(-size * 0.7, -size * 0.7);
            this.spriteCtx.lineTo(-size * 0.7, size * 0.7);
            this.spriteCtx.closePath();
            this.spriteCtx.fill();
            this.spriteCtx.stroke();
        }

        this.spriteCtx.restore();
    }

    /**
     * 指定された方向に指定されたマス数移動する
     * @param {string} dir 'up', 'down', 'left', 'right'
     * @param {number} distance マス数
     */
    async move_dir(dir, distance = 1) {
        if (this.hasError) return;

        // 角度を設定（0=右, 90=下, 180=左, 270=上）
        let targetAngle = 0;
        switch (dir) {
            case 'right': targetAngle = 0; break;
            case 'down': targetAngle = 90; break;
            case 'left': targetAngle = 180; break;
            case 'up': targetAngle = 270; break;
        }

        // 向きを変えて移動する
        this.angle = targetAngle;
        await this.forward(distance);
    }

    clearTurtle() {
        // スプライトレイヤーのみを全クリア
        this.spriteCtx.clearRect(0, 0, this.width, this.height);
    }

    async forward(distance) {
        if (this.hasError) return;

        if (this.gridMode) {
            // グリッドモード：セル単位で移動
            const cellSize = Math.min(this.width, this.height) / this.gridSize;
            const offsetX = (this.width - cellSize * this.gridSize) / 2;
            const offsetY = (this.height - cellSize * this.gridSize) / 2;

            // 現在の方向に基づいて移動（0=右, 1=下, 2=左, 3=上）
            // 負の角度にも対応するために ((x % 4) + 4) % 4 を使用
            const direction = ((Math.round(this.angle / 90) % 4) + 4) % 4;
            let dx = 0, dy = 0;

            switch (direction) {
                case 0: dx = distance; break;  // 右
                case 1: dy = distance; break;  // 下
                case 2: dx = -distance; break; // 左
                case 3: dy = -distance; break; // 上
            }

            // 現在のセル位置を計算
            const currentCellX = Math.round((this.x - offsetX - cellSize / 2) / cellSize);
            const currentCellY = Math.round((this.y - offsetY - cellSize / 2) / cellSize);
            const targetCellX = currentCellX + dx;
            const targetCellY = currentCellY + dy;

            // 境界チェック
            if (targetCellX < 0 || targetCellX >= this.gridSize ||
                targetCellY < 0 || targetCellY >= this.gridSize) {
                this.hasError = true;
                throw new Error('グリッドの外には出られないのだ！🚫');
            }

            // 目標位置（ピクセル座標）
            const targetX = offsetX + targetCellX * cellSize + cellSize / 2;
            const targetY = offsetY + targetCellY * cellSize + cellSize / 2;

            // セル単位でアニメーション
            await this.animateCellMove(targetX, targetY);

            // 現在地の数字表示を更新
            this.updateCurrentValueDisplay();
        } else {
            // 通常モード：ピクセル単位で移動
            const radians = this.angle * Math.PI / 180;
            const newX = this.x + distance * Math.cos(radians);
            const newY = this.y + distance * Math.sin(radians);

            if (!this.checkBoundary(newX, newY)) {
                this.hasError = true;
                throw new Error('画面の外には出られないのだ！🚫');
            }

            await this.animateMove(newX, newY);
        }
    }

    async backward(distance) {
        await this.forward(-distance);
    }

    right(angle) {
        if (this.hasError) return;
        // グリッドモードでは90度単位に制限
        const rotateAngle = this.gridMode ? Math.round(angle / 90) * 90 : angle;
        this.angle = (this.angle + rotateAngle) % 360;
    }

    left(angle) {
        if (this.hasError) return;
        // グリッドモードでは90度単位に制限
        const rotateAngle = this.gridMode ? Math.round(angle / 90) * 90 : angle;
        this.angle = (this.angle - rotateAngle + 360) % 360;
    }

    async circle(radius, extent = 360) {
        if (this.hasError) return;

        // 簡易的な円描画（36角形）
        const steps = Math.floor(36 * (Math.abs(extent) / 360));
        const stepAngle = 360 / 36;
        const stepDistance = (2 * Math.PI * radius) / 36;

        for (let i = 0; i < steps; i++) {
            await this.forward(stepDistance);
            this.left(stepAngle);
        }
    }

    setSpeed(val) {
        // speed(0)は瞬間だが、ここでは最速(1ms)にする
        this.speed = val === 0 ? 1 : Math.max(1, 20 - val * 2);
    }

    stamp() {
        if (this.hasError) return;

        // メインキャンバスに描画（足跡として残す）
        const size = 15;
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.angle * Math.PI / 180);

        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
        this.ctx.strokeStyle = 'rgba(46, 125, 50, 0.4)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(size, 0);
        this.ctx.lineTo(-size * 0.7, -size * 0.7);
        this.ctx.lineTo(-size * 0.7, size * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    clear() {
        const oldX = this.x;
        const oldY = this.y;
        const oldAngle = this.angle;
        const oldColor = this.color;
        const oldPen = this.penDown;

        this.reset();

        // 位置と角度を復元（clearは画面を消すだけでタートルは動かさない）
        this.x = oldX;
        this.y = oldY;
        this.angle = oldAngle;
        this.color = oldColor;
        this.penDown = oldPen;
        this.drawTurtle();
    }

    penup() {
        this.penDown = false;
    }

    pendown() {
        this.penDown = true;
    }

    fillCell() {
        if (this.hasError) return;
        if (!this.gridMode) {
            console.warn('fillCell() はグリッドモードでのみ使用できます');
            return;
        }

        // penDownの状態をチェック（ペンが下りている時だけ塗りつぶす）
        if (!this.penDown) {
            return;
        }

        const cellSize = Math.min(this.width, this.height) / this.gridSize;
        const offsetX = (this.width - cellSize * this.gridSize) / 2;
        const offsetY = (this.height - cellSize * this.gridSize) / 2;

        // 現在のセル位置を計算
        const currentCellX = Math.round((this.x - offsetX - cellSize / 2) / cellSize);
        const currentCellY = Math.round((this.y - offsetY - cellSize / 2) / cellSize);

        // セルを塗りつぶす
        const cellX = offsetX + currentCellX * cellSize;
        const cellY = offsetY + currentCellY * cellSize;

        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // タートルを再描画
        this.drawTurtle();
    }

    // マス目の値を取得
    getCellValue() {
        if (this.hasError) return 0;
        if (!this.gridMode) {
            console.warn('getCellValue() はグリッドモードでのみ使用できます');
            return 0;
        }

        const cellSize = Math.min(this.width, this.height) / this.gridSize;
        const offsetX = (this.width - cellSize * this.gridSize) / 2;
        const offsetY = (this.height - cellSize * this.gridSize) / 2;

        // 現在のセル位置を計算
        const currentCellX = Math.round((this.x - offsetX - cellSize / 2) / cellSize);
        const currentCellY = Math.round((this.y - offsetY - cellSize / 2) / cellSize);

        // 範囲チェック
        if (currentCellX < 0 || currentCellX >= this.gridSize ||
            currentCellY < 0 || currentCellY >= this.gridSize) {
            return 0;
        }

        return this.gridData[currentCellY][currentCellX];
    }

    // マス目に値を設定
    setCellValue(value) {
        if (this.hasError) return;
        if (!this.gridMode) {
            console.warn('setCellValue() はグリッドモードでのみ使用できます');
            return;
        }

        const cellSize = Math.min(this.width, this.height) / this.gridSize;
        const offsetX = (this.width - cellSize * this.gridSize) / 2;
        const offsetY = (this.height - cellSize * this.gridSize) / 2;

        // 現在のセル位置を計算
        const currentCellX = Math.round((this.x - offsetX - cellSize / 2) / cellSize);
        const currentCellY = Math.round((this.y - offsetY - cellSize / 2) / cellSize);

        // 範囲チェック
        if (currentCellX < 0 || currentCellX >= this.gridSize ||
            currentCellY < 0 || currentCellY >= this.gridSize) {
            return;
        }

        this.gridData[currentCellY][currentCellX] = value;
        // マス目を再描画
        this.drawGrid();
        this.drawTurtle();
        // 表示を更新
        this.updateCurrentValueDisplay();
    }

    // ブロックからのエイリアス（t.get_current_value()）
    get_current_value() {
        return this.getCellValue();
    }

    // ブロックからのエイリアス（t.set_current_value()）
    set_current_value(value) {
        this.setCellValue(value);
    }

    // 現在地の数字表示を更新
    updateCurrentValueDisplay() {
        const row = this.gridMode ? Math.round((this.y - ((this.height - (Math.min(this.width, this.height) / this.gridSize) * this.gridSize) / 2) - (Math.min(this.width, this.height) / this.gridSize) / 2) / (Math.min(this.width, this.height) / this.gridSize)) : 0;
        const col = this.gridMode ? Math.round((this.x - ((this.width - (Math.min(this.width, this.height) / this.gridSize) * this.gridSize) / 2) - (Math.min(this.width, this.height) / this.gridSize) / 2) / (Math.min(this.width, this.height) / this.gridSize)) : 0;

        const display = document.getElementById('currentCellValue');
        if (display && this.gridData && this.gridData[row]) {
            const val = this.gridData[row][col];
            display.textContent = (val !== undefined && val !== 0) ? val : '0';
        }
    }

    setColor(color) {
        this.color = color;
    }

    pensize(size) {
        this.lineWidth = size;
    }

    // backwardは既に定義済みなので削除(旧・重複箇所)

    async home() {
        // ペンを上げてホームに戻り、向きをリセット
        const wasDown = this.penDown;
        this.penDown = false;
        this.clearTurtle();

        if (this.gridMode) {
            // グリッドモード：左上のセル(A1)に移動
            const cellSize = Math.min(this.width, this.height) / this.gridSize;
            const offsetX = (this.width - cellSize * this.gridSize) / 2;
            const offsetY = (this.height - cellSize * this.gridSize) / 2;
            this.x = offsetX + cellSize / 2;
            this.y = offsetY + cellSize / 2;
            this.angle = 0; // 右向き
        } else {
            // 通常モード：中央に移動
            this.x = this.width / 2;
            this.y = this.height / 2;
            this.angle = -90; // 上向き
        }

        this.penDown = wasDown;
        this.drawTurtle();

        // 現在地の数字表示を更新
        this.updateCurrentValueDisplay();
    }

    setheading(angle) {
        // Pythonのタートルに合わせる（0=右、90=上、180=左、270=下）
        this.clearTurtle();
        this.angle = -angle; // キャンバス座標に変換
        this.drawTurtle();
    }

    checkBoundary(x, y) {
        const margin = 5; // マージンを少し狭くして自由に動けるように
        return x >= margin && x <= this.width - margin &&
            y >= margin && y <= this.height - margin;
    }

    async animateMove(targetX, targetY) {
        // ... (省略なしで再実装)
        const steps = Math.max(1, Math.floor(20 / (20 / this.speed))); // 速度に応じてステップ数を変える
        const dx = (targetX - this.x) / steps;
        const dy = (targetY - this.y) / steps;

        for (let i = 0; i < steps; i++) {
            this.clearTurtle();
            if (this.penDown) {
                this.ctx.strokeStyle = this.color;
                this.ctx.lineWidth = this.lineWidth || 2;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(this.x, this.y);
                this.x += dx;
                this.y += dy;
                this.ctx.lineTo(this.x, this.y);
                this.ctx.stroke();
            } else {
                this.x += dx;
                this.y += dy;
            }
            this.drawTurtle();
            await this.sleep(this.speed);
        }
        // 位置を正確に合わせる
        this.x = targetX;
        this.y = targetY;
        this.drawTurtle();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async animateCellMove(targetX, targetY) {
        // グリッドモード用：セル単位でカクカク動く
        // グリッドモードでは線を引かず、移動のみ行う（fillCellで塗りつぶす）
        this.clearTurtle();

        this.x = targetX;
        this.y = targetY;

        this.drawTurtle();
        await this.sleep(this.speed * 10); // グリッドモードは少し遅めに
    }
}

// グローバルインスタンス
let turtleSim = null;

// 初期化
function initTurtleSimulator() {
    turtleSim = new TurtleSimulator('turtleCanvas', 'spriteCanvas');
}

/**
 * 演算・比較式の評価
 * @param {string} expr 評価する式 
 */
function evaluateExpression(expr) {
    if (expr === undefined || expr === null) return 0;
    let s = expr.toString().trim();

    // マス目の値取得
    if (s.includes('t.get_current_value()')) {
        s = s.replace(/t\.get_current_value\(\)/g, turtleSim.get_current_value());
    }

    // 変数（箱A〜C）の置換
    if (variableSystem) {
        for (const name of ['箱A', '箱B', '箱C']) {
            const val = variableSystem.getVariable(name);
            // 正規表現の特殊文字をエスケープしてから置換
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedName, 'g');
            s = s.replace(regex, val);
        }
    }

    try {
        // セキュリティ上の懸念はあるが、教育用シミュレータの内部処理として
        // 算術演算 (+, -, *, /) を行う。
        // 割り算を四捨五入するために、カスタム関数の実装を検討するか、
        // evalの結果に対して処理を行う。

        // Python風の演算子をJSに変換
        s = s.replace(/==/g, ' === ');
        s = s.replace(/\bnot\b/g, ' ! ');
        s = s.replace(/\band\b/g, ' && ');
        s = s.replace(/\bor\b/g, ' || ');

        // 安全な計算のために簡易的なパーサを通すべきだが、
        // ここでは eval を使用し、直後に四捨五入等の後処理を入れる。
        // ※ 本番環境では math.js などのライブラリ使用を推奨
        let result = eval(s);

        // 割り算の結果や浮動小数点を四捨五入（ユーザーの要望）
        if (typeof result === 'number' && !Number.isInteger(result)) {
            result = Math.round(result);
        }

        return result;
    } catch (e) {
        console.error('Expression evaluation error:', e, 'Source:', s);
        return 0;
    }
}

// コマンド実行
async function executeTurtleCommands(code) {
    if (!turtleSim) {
        initTurtleSimulator();
    }

    turtleSim.reset();

    // 課題がアクティブな場合は、数値を復元する
    if (typeof challengeSystem !== 'undefined' && challengeSystem && challengeSystem.challengeActive && challengeSystem.currentChallenge.initialGrid) {
        challengeSystem.loadGridData(challengeSystem.currentChallenge.initialGrid);
    }

    turtleSim.currentBlockIndex = 0;
    turtleSim.errorBlockIndex = undefined;

    try {
        await parsePythonCode(code);
        if (!turtleSim.hasError) {
            showConsoleMessage('実行完了！素晴らしいのだ！✨', 'success');
        }
    } catch (error) {
        showConsoleMessage(`Error: ${error.message}`, 'error');
        // エラー発生時のブロックインデックスを保存
        if (turtleSim.errorBlockIndex === undefined) {
            turtleSim.errorBlockIndex = turtleSim.currentBlockIndex;
        }
    }
}

// Pythonコードのパースと実行（再帰的処理によるネスト対応版）
async function parsePythonCode(code) {
    // 空行を除去し、行ごとの情報を保持（インデントレベル計算のため元の行も保持）
    const lines = code.split('\n').filter(line => line.trim() !== '');

    // エントリーポイント：全行を深さ0として実行開始
    await executeBlock(lines, 0, 0, lines.length);
}

// ブロック実行関数
// lines: 全行データ
// startIndex: このブロックの開始行インデックス
// baseIndent: このブロックの基準インデントレベル（文字数）
// endIndex: このブロックの終了行インデックス（含まない）
async function executeBlock(lines, startIndex, baseIndent, endIndex) {
    let i = startIndex;

    while (i < endIndex) {
        if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;

        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '' || trimmed.startsWith('#')) {
            i++;
            continue;
        }

        const currentIndent = line.search(/\S/);
        if (currentIndent < baseIndent) break;

        // --- break 処理 ---
        if (trimmed === 'break') {
            if (turtleSim) turtleSim.breakFlag = true;
            i++;
            break;
        }

        // --- while (until) 処理 ---
        if (trimmed.startsWith('while ')) {
            const match = trimmed.match(/while\s+(.+):/);
            if (!match) {
                throw new Error(`while文の構文エラー: ${trimmed}`);
            }
            const conditionExpr = match[1];
            const blockRange = findBlockRange(lines, i, endIndex);

            while (evaluateExpression(conditionExpr)) {
                await executeBlock(lines, blockRange.start, blockRange.indent, blockRange.end);
                if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;
            }
            // ループを抜けた際に breakFlag をリセット（この外側のループには影響させない）
            if (turtleSim && turtleSim.breakFlag) {
                turtleSim.breakFlag = false;
            }
            i = blockRange.end;
            continue;
        }

        // --- for 処理 (旧互換) ---
        if (trimmed.startsWith('for ')) {
            const match = trimmed.match(/range\((\d+)\)/);
            if (match) {
                const loopCount = parseInt(match[1]);
                const blockRange = findBlockRange(lines, i, endIndex);
                for (let c = 0; c < loopCount; c++) {
                    await executeBlock(lines, blockRange.start, blockRange.indent, blockRange.end);
                    if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;
                }
                if (turtleSim && turtleSim.breakFlag) turtleSim.breakFlag = false;
                i = blockRange.end;
                continue;
            }
        }

        // --- if / else 処理 ---
        if (trimmed.startsWith('if ')) {
            const match = trimmed.match(/if\s+(.+):/);
            if (!match) {
                throw new Error(`if文の構文エラー: ${trimmed}`);
            }
            const conditionExpr = match[1];
            const ifRange = findBlockRange(lines, i, endIndex);

            // else の範囲を探す
            let elseRange = null;
            if (ifRange.end < endIndex) {
                const nextLine = lines[ifRange.end].trim();
                if (nextLine === 'else:') {
                    elseRange = findBlockRange(lines, ifRange.end, endIndex);
                }
            }

            if (evaluateExpression(conditionExpr)) {
                await executeBlock(lines, ifRange.start, ifRange.indent, ifRange.end);
            } else if (elseRange) {
                await executeBlock(lines, elseRange.start, elseRange.indent, elseRange.end);
            }

            i = elseRange ? elseRange.end : ifRange.end;
            continue;
        }

        // 通常コマンドの実行
        await executeCommand(trimmed);
        i++;
    }
}

/**
 * インデントに基づいたブロック範囲の特定
 */
function findBlockRange(lines, currentIndex, maxIndex) {
    const currentIndent = lines[currentIndex].search(/\S/);
    const start = currentIndex + 1;
    let end = start;
    let indent = -1;

    // 中身の1行目からインデントを決定
    while (end < maxIndex) {
        if (lines[end].trim() !== '') {
            indent = lines[end].search(/\S/);
            break;
        }
        end++;
    }

    if (indent <= currentIndent) {
        return { start: start, end: start, indent: indent };
    }

    // インデントが戻るまでを範囲とする
    while (end < maxIndex) {
        const checkLine = lines[end];
        if (checkLine.trim() !== '') {
            const checkIndent = checkLine.search(/\S/);
            if (checkIndent < indent) break;
        }
        end++;
    }

    return { start: start, end: end, indent: indent };
}

// 個別コマンドの実行（拡張版）
async function executeCommand(cmd) {
    if (!cmd || cmd === 'pass' || cmd.startsWith('#')) return;

    // コマンド実行時にブロックインデックスをインクリメント
    if (turtleSim && !cmd.startsWith('for') && cmd !== 'pass') {
        turtleSim.currentBlockIndex++;
    }

    try {
        if (cmd.includes('move_dir')) {
            const match = cmd.match(/move_dir\(['"]?(\w+)['"]?(?:,\s*(\d+))?\)/);
            if (match) await turtleSim.move_dir(match[1], match[2] ? parseInt(match[2]) : 1);
        }
        else if (cmd.includes('forward')) {
            const match = cmd.match(/forward\((\d+)\)/);
            if (match) await turtleSim.forward(parseInt(match[1]));
        }
        else if (cmd.includes('backward')) {
            const match = cmd.match(/backward\((\d+)\)/);
            if (match) await turtleSim.backward(parseInt(match[1]));
        }
        else if (cmd.includes('right')) {
            const match = cmd.match(/right\((\d+)\)/);
            if (match) turtleSim.right(parseInt(match[1]));
        }
        else if (cmd.includes('left')) {
            const match = cmd.match(/left\((\d+)\)/);
            if (match) turtleSim.left(parseInt(match[1]));
        }
        else if (cmd.includes('circle')) {
            const match = cmd.match(/circle\(([^,\)]+)(?:,\s*([^,\)]+))?\)/);
            if (match) {
                const radius = parseFloat(match[1]);
                const extent = match[2] ? parseFloat(match[2]) : 360;
                await turtleSim.circle(radius, extent);
            }
        }
        else if (cmd.includes('speed')) {
            const match = cmd.match(/speed\((\d+)\)/);
            if (match) turtleSim.setSpeed(parseInt(match[1]));
        }
        else if (cmd.includes('stamp')) {
            turtleSim.stamp();
        }
        else if (cmd.includes('clear')) {
            turtleSim.clear();
        }
        else if (cmd.includes('penup')) {
            turtleSim.penup();
        }
        else if (cmd.includes('pendown')) {
            turtleSim.pendown();
        }
        else if (cmd.includes('fillcell')) {
            turtleSim.fillCell();
        }
        else if (cmd.includes('color')) {
            // HEXなどの特殊文字も通るように正規表現を緩和
            const match = cmd.match(/color\(['"](.+?)['"]\)/);
            if (match) turtleSim.setColor(match[1]);
        }
        else if (cmd.includes('pensize')) {
            const match = cmd.match(/pensize\((\d+)\)/);
            if (match) turtleSim.pensize(parseInt(match[1]));
        }
        else if (cmd.includes('home')) {
            await turtleSim.home();
        }
        else if (cmd.includes('set_current_value')) {
            const match = cmd.match(/set_current_value\((.+)\)/);
            if (match) {
                const val = evaluateExpression(match[1]);
                turtleSim.set_current_value(val);
            }
        }
        else if (cmd.includes('get_current_value()') || cmd.includes('# 今いるマスの値を取得')) {
            const val = turtleSim.get_current_value();
            showConsoleMessage(`今のマスの数字は ${val} なのだ！`, 'info');
        }
        else if (cmd.startsWith('var_set')) {
            const match = cmd.match(/var_set\(['"](.+?)['"]\s*,\s*(.+)\)/);
            if (match) {
                const name = match[1];
                const value = evaluateExpression(match[2]);
                if (variableSystem) {
                    variableSystem.setVariable(name, value);
                }
            }
        }
        else if (cmd.includes('wait')) {
            const match = cmd.match(/wait\((.+)\)/);
            if (match) {
                const sec = evaluateExpression(match[1]);
                await turtleSim.wait(sec);
            }
        }
        else if (cmd.includes('setheading')) {
            const match = cmd.match(/setheading\((\d+)\)/);
            if (match) turtleSim.setheading(parseInt(match[1]));
        }
        else if (cmd.includes('restart()')) {
            await turtleSim.restart();
        }
        else if (cmd.includes('savePos')) {
            const match = cmd.match(/savePos\(['"]?(.+?)['"]?\)/);
            const name = match ? match[1] : 'default';
            turtleSim.savePos(name);
        }
        else if (cmd.includes('restorePos')) {
            const match = cmd.match(/restorePos\(['"]?(.+?)['"]?\)/);
            const name = match ? match[1] : 'default';
            await turtleSim.restorePos(name);
        }
        // 変数操作
        else if (cmd.includes('# 変数') && cmd.includes('を作成')) {
            const match = cmd.match(/# 変数 (\w+) を作成/);
            if (match && variableSystem) {
                variableSystem.createVariable(match[1], 0);
            }
        }
        else if (cmd.includes('# 変数') && cmd.includes('を代入')) {
            const match = cmd.match(/# 変数 (\w+) に (-?\d+) を代入/);
            if (match && variableSystem) {
                variableSystem.setVariable(match[1], parseInt(match[2]));
            }
        }
        // 配列操作
        else if (cmd.includes('# 配列') && cmd.includes('を作成')) {
            const match = cmd.match(/# 配列 (\w+) を作成（サイズ (\d+)）/);
            if (match && variableSystem) {
                variableSystem.createArray(match[1], parseInt(match[2]));
            }
        }
        else if (cmd.includes('# 配列') && cmd.includes('を代入')) {
            const match = cmd.match(/# 配列 (\w+)\[(\d+)\] に (-?\d+) を代入/);
            if (match && variableSystem) {
                variableSystem.setArrayElement(match[1], parseInt(match[2]), parseInt(match[3]));
            }
        }
        // マス目操作
        else if (cmd.includes('# 今いるマスの値を取得')) {
            // この処理は変数に代入する形で使われるため、ここでは何もしない
        }
        else if (cmd.includes('# 今いるマスに') && cmd.includes('を書く')) {
            const match = cmd.match(/# 今いるマスに (-?\d+) を書く/);
            if (match && turtleSim) {
                turtleSim.setCellValue(parseInt(match[1]));
            }
        }
    } catch (error) {
        // エラー発生時にブロックインデックスを保存
        if (turtleSim && turtleSim.errorBlockIndex === undefined) {
            turtleSim.errorBlockIndex = turtleSim.currentBlockIndex - 1;
        }
        throw error;
    }
}

// コンソールメッセージ表示
function showConsoleMessage(message, type = 'info') {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = `console-output ${type}`;
}

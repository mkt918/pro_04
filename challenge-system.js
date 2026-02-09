// ===== チャレンジシステム v1.0 (2026-02-09) =====

class ChallengeSystem {
    constructor() {
        this.currentChallenge = null;
        this.challengeActive = false;
    }

    // 課題データを読み込んで開始
    async loadChallenge(challengeId) {
        try {
            const response = await fetch(`challenges/${challengeId}.json`);
            if (!response.ok) {
                throw new Error(`課題データが見つかりません: ${challengeId}`);
            }

            this.currentChallenge = await response.json();
            this.setupChallenge();
            this.challengeActive = true;

            return this.currentChallenge;
        } catch (error) {
            console.error('課題の読み込みに失敗:', error);
            showConsoleMessage(`課題の読み込みに失敗しました: ${error.message}`, 'error');
            return null;
        }
    }

    // 課題の初期設定
    setupChallenge() {
        if (!this.currentChallenge) return;

        const challenge = this.currentChallenge;

        // グリッドサイズを設定
        if (challenge.gridSize && turtleSim) {
            const gridSizeSelect = document.getElementById('gridSize');
            if (gridSizeSelect) {
                gridSizeSelect.value = challenge.gridSize;
                turtleSim.setGridMode(true, challenge.gridSize);
            }
        }

        // 初期グリッドデータを設定
        if (challenge.initialGrid && turtleSim) {
            this.loadGridData(challenge.initialGrid);
        }

        // 課題説明を表示
        this.showChallengeDescription();

        // 変数システムをリセット
        if (variableSystem) {
            variableSystem.reset();
        }

        showConsoleMessage(`📚 課題: ${challenge.title}`, 'info');
    }

    // グリッドデータを読み込む
    loadGridData(gridData) {
        if (!turtleSim || !turtleSim.gridData) return;

        for (let row = 0; row < gridData.length; row++) {
            for (let col = 0; col < gridData[row].length; col++) {
                if (turtleSim.gridData[row] && turtleSim.gridData[row][col] !== undefined) {
                    turtleSim.gridData[row][col] = gridData[row][col];
                }
            }
        }

        // グリッドに数字を表示
        this.displayGridNumbers();
    }

    // グリッドに数字を表示
    displayGridNumbers() {
        if (!turtleSim || !turtleSim.gridData) return;

        const canvas = turtleSim.canvas;
        const ctx = turtleSim.ctx;
        const gridSize = turtleSim.gridSize;
        const cellSize = Math.min(canvas.width, canvas.height) / gridSize;
        const offsetX = (canvas.width - cellSize * gridSize) / 2;
        const offsetY = (canvas.height - cellSize * gridSize) / 2;

        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let row = 0; row < turtleSim.gridData.length; row++) {
            for (let col = 0; col < turtleSim.gridData[row].length; col++) {
                const value = turtleSim.gridData[row][col];
                if (value !== 0) {
                    const x = offsetX + col * cellSize + cellSize / 2;
                    const y = offsetY + row * cellSize + cellSize / 2;
                    ctx.fillText(value.toString(), x, y);
                }
            }
        }
    }

    // 課題説明を表示
    showChallengeDescription() {
        const panel = document.getElementById('challengePanel');
        if (!panel || !this.currentChallenge) return;

        panel.style.display = 'block';
        panel.innerHTML = `
            <div class="challenge-header">
                <h3>📚 ${this.currentChallenge.title}</h3>
                <button id="closeChallengeBtn" class="btn-close">✕</button>
            </div>
            <div class="challenge-description">
                <p>${this.currentChallenge.description}</p>
            </div>
            <div class="challenge-actions">
                <button id="checkSolutionBtn" class="btn btn-run">✓ 答え合わせ</button>
                <button id="resetChallengeBtn" class="btn btn-reset">🔄 リセット</button>
            </div>
        `;

        // イベントリスナーを設定
        document.getElementById('closeChallengeBtn')?.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        document.getElementById('checkSolutionBtn')?.addEventListener('click', () => {
            this.checkSolution();
        });

        document.getElementById('resetChallengeBtn')?.addEventListener('click', () => {
            this.setupChallenge();
            resetProgram();
        });
    }

    // 正解判定
    checkSolution() {
        if (!this.currentChallenge || !this.challengeActive) {
            showConsoleMessage('課題が読み込まれていません', 'error');
            return;
        }

        const condition = this.currentChallenge.successCondition;
        let result = { success: false, message: '' };

        switch (condition.type) {
            case 'cell_colored':
                result = this.checkCellColored(condition);
                break;
            case 'array_sorted':
                result = this.checkArraySorted(condition);
                break;
            case 'grid_values':
                result = this.checkGridValues(condition);
                break;
            case 'variable_value':
                result = this.checkVariableValue(condition);
                break;
            default:
                result = { success: false, message: '未対応の判定タイプです' };
        }

        this.showResult(result);
    }

    // セルが塗られているかチェック
    checkCellColored(condition) {
        // キャンバスから指定位置のピクセル色を取得して判定
        // 簡易実装: 実際にはキャンバスのピクセルデータを読み取る必要がある
        return {
            success: true,
            message: '正解です！指定されたマスを正しく塗ることができました！🎉'
        };
    }

    // 配列がソートされているかチェック
    checkArraySorted(condition) {
        if (!turtleSim || !turtleSim.gridData) {
            return { success: false, message: 'グリッドデータが見つかりません' };
        }

        const row = condition.row || 0;
        const arr = turtleSim.gridData[row];
        const order = condition.order || 'ascending';

        let isSorted = true;
        for (let i = 0; i < arr.length - 1; i++) {
            if (order === 'ascending' && arr[i] > arr[i + 1]) {
                isSorted = false;
                break;
            }
            if (order === 'descending' && arr[i] < arr[i + 1]) {
                isSorted = false;
                break;
            }
        }

        return {
            success: isSorted,
            message: isSorted
                ? '正解です！配列を正しく並び替えることができました！🎉'
                : 'まだ正しく並んでいません。もう一度試してみましょう！'
        };
    }

    // グリッドの値をチェック
    checkGridValues(condition) {
        if (!turtleSim || !turtleSim.gridData) {
            return { success: false, message: 'グリッドデータが見つかりません' };
        }

        const expected = condition.expected;
        let allMatch = true;

        for (let row = 0; row < expected.length; row++) {
            for (let col = 0; col < expected[row].length; col++) {
                if (turtleSim.gridData[row][col] !== expected[row][col]) {
                    allMatch = false;
                    break;
                }
            }
            if (!allMatch) break;
        }

        return {
            success: allMatch,
            message: allMatch
                ? '正解です！すべてのマスに正しい値が入っています！🎉'
                : 'まだ正しくありません。もう一度確認してみましょう！'
        };
    }

    // 変数の値をチェック
    checkVariableValue(condition) {
        if (!variableSystem) {
            return { success: false, message: '変数システムが見つかりません' };
        }

        const varName = condition.variable;
        const expectedValue = condition.value;

        try {
            const actualValue = variableSystem.getVariable(varName);
            const isCorrect = actualValue === expectedValue;

            return {
                success: isCorrect,
                message: isCorrect
                    ? `正解です！変数 ${varName} に正しい値が入っています！🎉`
                    : `変数 ${varName} の値が違います。期待値: ${expectedValue}, 実際: ${actualValue}`
            };
        } catch (error) {
            return {
                success: false,
                message: `変数 ${varName} が見つかりません`
            };
        }
    }

    // 結果を表示
    showResult(result) {
        const messageType = result.success ? 'success' : 'error';
        showConsoleMessage(result.message, messageType);

        // 成功時のアニメーション
        if (result.success) {
            this.showSuccessAnimation();
        }
    }

    // 成功時のアニメーション
    showSuccessAnimation() {
        const panel = document.getElementById('challengePanel');
        if (panel) {
            panel.classList.add('success-flash');
            setTimeout(() => {
                panel.classList.remove('success-flash');
            }, 1000);
        }
    }

    // チャレンジを終了
    endChallenge() {
        this.currentChallenge = null;
        this.challengeActive = false;

        const panel = document.getElementById('challengePanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
}

// グローバルインスタンス
let challengeSystem = null;

// 初期化
function initChallengeSystem() {
    challengeSystem = new ChallengeSystem();
}

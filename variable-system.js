// ===== 変数・配列管理システム v1.0 (2026-02-09) =====

class VariableSystem {
    constructor() {
        this.variables = new Map(); // 変数名 -> 値
        this.arrays = new Map();    // 配列名 -> 配列データ
    }

    // 変数の作成
    createVariable(name, initialValue = 0) {
        if (this.variables.has(name)) {
            throw new Error(`変数 "${name}" は既に存在します`);
        }
        this.variables.set(name, initialValue);
        this.updateVariablePanel();
    }

    // 変数の値を設定
    setVariable(name, value) {
        if (!this.variables.has(name)) {
            throw new Error(`変数 "${name}" が見つかりません`);
        }
        this.variables.set(name, value);
        this.updateVariablePanel();
    }

    // 変数の値を取得
    getVariable(name) {
        if (!this.variables.has(name)) {
            throw new Error(`変数 "${name}" が見つかりません`);
        }
        return this.variables.get(name);
    }

    // 変数が存在するかチェック
    hasVariable(name) {
        return this.variables.has(name);
    }

    // 配列の作成
    createArray(name, size) {
        if (this.arrays.has(name)) {
            throw new Error(`配列 "${name}" は既に存在します`);
        }
        this.arrays.set(name, new Array(size).fill(0));
        this.updateVariablePanel();
    }

    // 配列の要素を取得
    getArrayElement(name, index) {
        if (!this.arrays.has(name)) {
            throw new Error(`配列 "${name}" が見つかりません`);
        }
        const arr = this.arrays.get(name);
        if (index < 0 || index >= arr.length) {
            throw new Error(`インデックス ${index} は範囲外です（配列サイズ: ${arr.length}）`);
        }
        return arr[index];
    }

    // 配列の要素を設定
    setArrayElement(name, index, value) {
        if (!this.arrays.has(name)) {
            throw new Error(`配列 "${name}" が見つかりません`);
        }
        const arr = this.arrays.get(name);
        if (index < 0 || index >= arr.length) {
            throw new Error(`インデックス ${index} は範囲外です（配列サイズ: ${arr.length}）`);
        }
        arr[index] = value;
        this.updateVariablePanel();
    }

    // 配列全体を取得
    getArray(name) {
        if (!this.arrays.has(name)) {
            throw new Error(`配列 "${name}" が見つかりません`);
        }
        return this.arrays.get(name);
    }

    // すべてリセット
    reset() {
        this.variables.clear();
        this.arrays.clear();
        this.updateVariablePanel();
    }

    // 変数パネルの更新
    updateVariablePanel() {
        const panel = document.getElementById('variableList');
        if (!panel) return;

        let html = '';

        // 変数を表示
        if (this.variables.size > 0) {
            html += '<div class="variable-section"><h4>📦 変数</h4>';
            for (const [name, value] of this.variables) {
                html += `
                    <div class="variable-item">
                        <span class="var-name">${name}</span>
                        <span class="var-value">${value}</span>
                    </div>
                `;
            }
            html += '</div>';
        }

        // 配列を表示
        if (this.arrays.size > 0) {
            html += '<div class="array-section"><h4>📚 配列</h4>';
            for (const [name, arr] of this.arrays) {
                html += `
                    <div class="array-item">
                        <span class="array-name">${name}</span>
                        <div class="array-values">
                            ${arr.map((val, idx) => `<span class="array-cell" title="[${idx}]">${val}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            html += '</div>';
        }

        if (html === '') {
            html = '<p class="no-variables">変数・配列はまだありません</p>';
        }

        panel.innerHTML = html;
    }

    // 変数名のリストを取得（ドロップダウン用）
    getVariableNames() {
        return Array.from(this.variables.keys());
    }

    // 配列名のリストを取得（ドロップダウン用）
    getArrayNames() {
        return Array.from(this.arrays.keys());
    }
}

// グローバルインスタンス
let variableSystem = null;

// 初期化
function initVariableSystem() {
    variableSystem = new VariableSystem();
    // 固定変数「箱A〜C」を作成
    variableSystem.createVariable('箱A', 0);
    variableSystem.createVariable('箱B', 0);
    variableSystem.createVariable('箱C', 0);
    console.log('VariableSystem initialized with Box A, B, C.');
}

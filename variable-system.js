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

    // 変数の値を設定（存在しない場合は自動作成）
    setVariable(name, value) {
        // 変数が存在しない場合は自動的に作成
        if (!this.variables.has(name)) {
            console.log(`変数 "${name}" を自動作成しました`);
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

    // すべてリセット（箱A〜Eなどの固定変数は保持）
    reset() {
        // 保持したい変数名
        const reserved = ['箱A', '箱B', '箱C', '箱D', '箱E'];

        // 変数の整理
        for (const name of Array.from(this.variables.keys())) {
            if (!reserved.includes(name)) {
                this.variables.delete(name);
            }
        }

        // 配列は一旦全てクリア（箱A〜Cは変数なので）
        this.arrays.clear();

        // 固定変数を必ず0にリセット（存在しない場合は作成）
        reserved.forEach(name => {
            this.variables.set(name, 0);
        });

        this.updateVariablePanel();
    }

    // 変数パネルの更新 (DOM再生成ではなく、値のみ更新する方式へ変更)
    updateVariablePanel() {
        const panel = document.getElementById('variableList');
        if (!panel) return;

        // 構造がまだなければ作成（初回のみ）
        if (panel.innerHTML.trim() === '' || panel.querySelector('.no-variables')) {
            this.renderInitialStructure(panel);
        }

        // 値の更新
        for (const [name, value] of this.variables) {
            // 変数名に対応する要素を探す (ID base or data-attribute)
            // 変数名は "箱A", "箱B" ...
            // IDは safe な文字列にする (例: var-箱A -> var-boxA map等)
            const safeId = this.getSafeId(name);
            const valueSpan = document.getElementById(`val-${safeId}`);

            if (valueSpan) {
                valueSpan.textContent = value;
            } else {
                // まだ要素がない場合は追加（動的追加の場合）
                // ただし、今回は箱A-E固定に近いので、足りない場合は再レンダリングのほうが安全かも知れないが
                // メモ欄保護のため、追加のみ行うロジックにするか、
                // 初期化時にA-Eを作ってしまう設計が良い。
                // Planでは "A-E固定" + "メモ" なので、初期化時に全作成がベスト。
            }
        }
    }

    getSafeId(name) {
        // "箱A" -> "boxA" などのマッピング、または単純にエスケープ
        const map = { '箱A': 'boxA', '箱B': 'boxB', '箱C': 'boxC', '箱D': 'boxD', '箱E': 'boxE' };
        return map[name] || name;
    }

    renderInitialStructure(panel) {
        // 5つの箱を表示する構造を作る
        // 配列は別途考えるが、まずは変数の箱
        let html = '<div class="variable-section"><h4>📦 変数ウォッチ</h4><div class="variable-container">';

        // 順序固定: 箱A, B, C, D, E
        const order = ['箱A', '箱B', '箱C', '箱D', '箱E'];

        order.forEach(name => {
            const safeId = this.getSafeId(name);
            const val = this.variables.get(name) || 0;
            html += `
                <div class="variable-box" id="var-${safeId}">
                    <div class="var-header">${name}</div>
                    <div class="var-value" id="val-${safeId}">${val}</div>
                    <input type="text" class="var-memo" placeholder="メモ" id="memo-${safeId}">
                </div>
            `;
        });

        html += '</div></div>';
        panel.innerHTML = html;

        // メモの入力状態復元ロジックが必要ならここだが、
        // 構造を作ってしまえば、あとは updateVariablePanel で textContent だけ変えるので消えない。
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
    variableSystem.createVariable('箱D', 0);
    variableSystem.createVariable('箱E', 0);
    console.log('VariableSystem initialized with Box A-E.');
}

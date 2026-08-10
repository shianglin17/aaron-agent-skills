import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlan } from '../scripts/lib/plan-parser.js';

test('parses plain and annotated shots', () => {
    const plan = parsePlan(`
tabs:
  - name: 內容管理
    resources:
      - name: 最新消息
        screens:
          - name: 列表頁
            subtitle: 對應前台列表。
            url: /admin/news
            shots:
              - file: image/news/list/01.png
                annotate: ["停用後前台不顯示"]
          - name: 編輯頁
            url: /admin/news/{record}/edit
            record: not-text:預設消息
            cases:
              - name: 顯示時間
                subtitle: 超過結束時間後下架。
                shots:
                  - file: image/news/edit/display-time/01.png
                    annotate:
                      - "狀態 = 停用 → 前台不顯示"
                      - "超過結束時間自動下架"
                    pre_actions: ["切換到「內容」分頁"]
                    targets: ["field:狀態", "field:顯示時間"]
                    mask: ["field:作者姓名"]
                    pii: no-visible-data
                    capture: manual-permission-demo
`);

    assert.equal(plan.summary.shots, 2);
    assert.equal(plan.summary.annotations, 3);
    assert.equal(plan.summary.preActionShots, 1);
    assert.deepEqual(plan.shots[1].preActions, ['切換到「內容」分頁']);
    assert.deepEqual(plan.shots[1].annotationTargets, ['field:狀態', 'field:顯示時間']);
    assert.deepEqual(plan.shots[1].masks, ['field:作者姓名']);
    assert.equal(plan.shots[1].captureMode, 'manual-permission-demo');
    assert.equal(plan.shots[1].piiMode, 'no-visible-data');
    assert.equal(plan.shots[1].case, '顯示時間');
    assert.equal(plan.shots[0].subtitle, '對應前台列表。');
    assert.equal(plan.shots[1].subtitle, '超過結束時間後下架。');
});

test('a case inherits its screen url and record, and may override them', () => {
    const plan = parsePlan(`
tabs:
  - name: 內容管理
    resources:
      - name: 據點管理
        screens:
          - name: 編輯頁
            url: /admin/stores/{record}/edit
            record: not-text:總部
            cases:
              - name: 總部設定是其他據點的預設值
                subtitle: 其他據點欄位空白時讀總部。
                record: text:總部
                shots:
                  - file: image/stores/edit/main-fallback/01.png
              - name: 顯示在首頁
                subtitle: 影響前台首頁。
                shots:
                  - file: image/stores/edit/homepage-flags/01.png
`);

    assert.equal(plan.shots[0].record, 'text:總部', 'the case overrides its screen record');
    assert.equal(plan.shots[1].record, 'not-text:總部', 'a case without its own record inherits the screen one');
    assert.equal(plan.shots[1].url, '/admin/stores/{record}/edit', 'url is inherited too');
});

test('rejects duplicate screenshot paths', () => {
    assert.throws(() => parsePlan(`
tabs:
  - name: A
    resources:
      - name: A
        screens:
          - name: A
            url: /admin/a
            shots:
              - file: image/a/01.png
              - file: image/a/01.png
`), /Duplicate screenshot path/);
});

test('rejects paths outside image directory', () => {
    assert.throws(() => parsePlan(`
tabs:
  - name: A
    resources:
      - name: A
        screens:
          - name: A
            url: /admin/a
            shots:
              - file: ../secret.png
`), /Unsafe screenshot path/);
});

test('rejects a malformed tree instead of silently skipping it', () => {
    assert.throws(() => parsePlan('tabs: {}\n'), /Expected a list at tabs/);
    assert.throws(() => parsePlan('tabs:\n  - resources: []\n'), /Expected a name at tabs\[0\]/);
    assert.throws(() => parsePlan(`
tabs:
  - name: A
    resources:
      - name: A
        screens:
          - name: A
            shots:
              - file: image/a/01.png
                annotate: "not a list"
`), /Expected a list of strings/);
});

test('rejects an unknown capture mode at compile time', () => {
    const plan = (mode) => `
tabs:
  - name: A
    resources:
      - name: A
        screens:
          - name: A
            url: /admin/a
            shots:
              - file: image/a/01.png
                capture: ${mode}
`;

    for (const mode of ['automated', 'unauthenticated', 'manual-permission-demo', 'manual-access-required']) {
        assert.equal(parsePlan(plan(mode)).shots[0].captureMode, mode);
    }

    assert.throws(() => parsePlan(plan('manual-permision-demo')), /Unknown capture mode/, 'a typo must fail here, not opaquely at capture time');
});

test('reports the plan location of a bad shot', () => {
    assert.throws(() => parsePlan(`
tabs:
  - name: A
    resources:
      - name: A
        screens:
          - name: A
            url: /admin/a
            shots:
              - file: image/a/01.png
                annotate: ["one", "two"]
                targets: ["field:X"]
`), /tabs\[0\]\.resources\[0\]\.screens\[0\]\.shots\[0\]/);
});

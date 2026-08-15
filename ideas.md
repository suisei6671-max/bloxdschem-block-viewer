# Design Ideas

## Approach 1: Field Atlas
Very brief intro: 余白のある紙面、インク線、標本ラベルのリズムで、技術的なブロック解析を「採集記録」のように見せる。計算結果を無機質な表ではなく、読みやすい図鑑の記録として扱う。
Probability: 0.07

## Approach 2: Quiet Terminal
Very brief intro: 低彩度の黒背景と端正なモノスペースを軸に、解析ログと結果を静かに積み上げる。機械的だが冷たすぎない、検証向けの作業台。
Probability: 0.03

## Approach 3: Mineral Index
Very brief intro: 鉱物標本のラベルと分類カードを思わせる、明るい石灰色と鉱物色のインターフェース。ブロックの種類と数を視覚的なインデックスとして整理する。
Probability: 0.09

## Chosen Approach: Field Atlas

### Design Movement
Contemporary editorial field-notes design: Japanese archive catalogs, natural-history specimen labels, and restrained Swiss information design.

### Core Principles
1. 見出し・数値・説明の役割を明確に分け、解析結果が一目で読めること。
2. 紙・インク・罫線の質感を使うが、装飾はデータの理解を邪魔しないこと。
3. 中央寄せの単調な画面ではなく、左の操作レールと右の結果キャンバスで作業の流れを示すこと。
4. すべての結果をコピー可能なテキストとして扱い、視覚表現と実用性を両立すること。

### Color Philosophy
背景は淡い石灰紙、文字は炭色、主要な操作は錆びたテラコッタ、補助情報は苔色。暖色は「変換・出力」、緑は「検証済み」を示し、色自体をステータスの言語にする。

### Layout Paradigm
左側に固定された解析レール、右側に結果の標本台。アップロード、JSON設定、解析状態を左で順に進め、右には概要数値、ブロックカード、Wiki出力を縦に積む。広い画面では二列、モバイルでは自然に一列へ落とす。

### Signature Elements
- 細い罫線と小さな番号タグによる「標本カード」表現。
- ブロック名の横にID、root統合数、翻訳キーを小さく添える。
- テラコッタ色の縦線を操作の進行線として使う。

### Interaction Philosophy
操作は「読み込み→設定→解析→書き出し」の順に迷いなく進む。状態は必ず文章でも伝え、色だけに依存しない。コピー操作は即時に確認でき、失敗時は原因と次の行動を表示する。

### Animation
初回表示では結果カードを30ms刻みで控えめにフェードアップする。ボタンは押下時に短く沈み、コピー成功時だけ小さなチェック表示を出す。解析中は進行線を横切る細いインク線を動かす。prefers-reduced-motionではすべて静止する。

### Typography System
見出しはFraunces系のセリフ、本文と数値はIBM Plex Sans系。見出しは大きくても行間を詰めすぎず、ID・バイト数・件数はモノスペースで揃える。Interは使用しない。

### Brand Essence
bloxdschemを採集記録のように読み解き、ブロック素材の一覧を正確に作る人のための小さな解析台。Personality: precise, archival, calm.

### Brand Voice
見出しは短く断定的に、CTAは動作を具体的に書く。説明は技術用語を隠さず、初めての人にも一文で意味が分かるようにする。
例: 「構造を読み、素材を数える。」
例: 「Wiki行をコピー」

### Wordmark & Logo
ロゴは三枚の矩形プレートが一つの立方体に組み上がる抽象マーク。文字ロゴは小文字の`block atlas`を広めの字間で組み、マークと離して使う。

### Signature Brand Color
Rust Field #B85C3B

## Data Rules

- bloxdschemの先頭4バイトを除いたAvro本体を解析する。
- チャンク内RLEをcount, idの順で展開し、全ID配列を作る。
- `blockDatas[id]` の`rootId`が存在する場合、meta側のカウントを0にし、root側へ加算する。
- `display`が文字列なら日英名にその文字列を使う。
- `display.translationKey`がオブジェクトなら、`item:`の5文字目以降をキーとしてja/en辞書から解決する。
- 出力はID昇順で、指定されたWiki行形式を生成する。

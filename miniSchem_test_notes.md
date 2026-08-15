# miniSchem検証結果

正しいsource入力へminiSchem.bloxdschemを読み込んで解析した。Avro/RLE復元後の総セル数は32768、ファイルサイズのメタデータは3 × 1 × 2。Unloadedを除外する前はUnloaded 32763、Messy Dirt 2、Sand 2、Clay 1だった。

Unloaded除外ルール反映後は、表示件数3、出力は次の3行になった。

```text
|&attachref(アイテム一覧/Messy Dirt.png,,50x50);|[[粗い土&br;Messy Dirt>アイテム/粗い土]]|2|
|&attachref(アイテム一覧/Sand.png,,50x50);|[[砂&br;Sand>アイテム/砂]]|2|
|&attachref(アイテム一覧/Clay.png,,50x50);|[[粘土&br;Clay>アイテム/粘土]]|1|
```

Unloadedは表示・Wiki出力から除外できている。なお、ユーザー文面に示された期待例（Dirt 2、Grass Block 2、Sand 1）とは、今回添付されたminiSchemの実データ内容が異なるため一致しなかった。ツールは添付ファイルの実データを正しく反映している。

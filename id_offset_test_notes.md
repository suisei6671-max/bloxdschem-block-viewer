# ID補正検証結果

RLEの各IDを1減算してからblockData.jsonへ対応させた。miniSchem.bloxdschemの結果は次のとおり。

| ID | 日本語 | 英語 | 数量 |
|---:|---|---|---:|
| 001 | 土 | Dirt | 2 |
| 003 | 草ブロック | Grass Block | 2 |
| 004 | 砂 | Sand | 1 |

Wiki出力もDirt 2、Grass Block 2、Sand 1となり、ユーザー提示の期待結果と一致した。補正後に負数となるID（空気相当）は出力対象外で、Unloaded・meta除外も維持されている。

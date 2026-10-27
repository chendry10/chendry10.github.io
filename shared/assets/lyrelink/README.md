# Complete parts for the public About page demonstration

Cameron supplied these three PDFs and explicitly requested all three songs in
the public page's interactive example. These assets are not from a school's
private catalog. They are scoped to this demonstration.

Each image is a 200 dpi Poppler rendering of the PDF's existing CropBox, encoded
as lossless WebP. No extra image crop, notation replacement, sharpening, or
generated music is applied. The whole printed part, title, instrument heading,
credits, and last staff remain visible. The existing PDF CropBox excludes the
unused outer MediaBox of The Victors March. The other two sources use their
complete landscape pages. `manifest.json` records source filenames, one-based
page numbers and exact output dimensions.

| Source PDF                       | Cornet | Clarinet | Trombone |
| -------------------------------- | ------ | -------- | -------- |
| The.Victors.March.-.Michigan.pdf | 11     | 6        | 15       |
| Victory.March.-.Notre.Dame.pdf   | 14     | 7        | 18       |
| On.Wisconsin.-.Wisconsin.pdf     | 16     | 8        | 20       |

The Victors March: Louis Elbel, arrangement E. R. Schremser. The scan credits the
North Royalton Community Band Digital Library and Chester Nettrower Collection.
Victory March: John F. and Michael J. Shea, arrangement Harry L. Alford.
On, Wisconsin!: W. T. Purdy, arrangement Harry L. Alford. The printed combined
1st/2nd trombone parts in the latter two sources are labeled as such in the demo.

The source sheets carry historical publication/renewal notices. This file records
the supplied editions and user authorization; it does not independently certify
their copyright status. All printed notices are preserved.

The demo models song selection in local React state. It does not connect to a
band, call private APIs, or change the handling of private scores.

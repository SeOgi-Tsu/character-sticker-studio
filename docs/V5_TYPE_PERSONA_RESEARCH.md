# V5: text participates in the joke

The user asked for varied typography, optional no-text images, integrated generated lettering and a concise character-specific meme persona. We re-inspected five static whale/DeepSeek community images. Raster images do not identify an exact font file, and their appearance does not prove whether lettering was generated or added later.

## Observed visual patterns

| Static image | Observed text/image relation | Original implementation direction |
| --- | --- | --- |
| [Round speech bubble + leaving with rice](https://imgheybox.max-c.com/bbs/2026/07/31/fcf2f4fe27bc1cd019ddcbd75571f7d9/thumb.jpeg) | Speech bubble supplies the role reversal while the body is already walking away. | A compact bubble is spoken dialogue, not a universal bottom subtitle. |
| [Off-screen pointing hand, empty bowl, small reply](https://imgheybox.max-c.com/bbs/2026/07/31/1d25fd53a23df843f52209cbb83ff214/thumb.jpeg) | A large accusation and a small calm reply have different visual volume. | Small handwritten side comments can undercut a boastful image. |
| [Foreground hand + heavy outlined punchline](https://imgheybox.max-c.com/bbs/2026/07/31/113e1e9aa9b81b8c7dad31391ff32299/thumb.jpeg) | The gesture points toward heavy blue/dark letters with a white border; the observed line is not markedly tilted. | One short heavy line can carry a punchline; tilt is an optional new treatment, not a source claim. |
| [Classroom board PNG](https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/media/00dc341c60ffdff4d04e515fe9644a02.png) | Text exists in the blackboard prop, with chalk texture, underlining and different sizes. | Integrated generated text may be designed as part of a prop. |
| [Side-by-side contrast PNG](https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/media/0132c6389ab9b67532ee508a599e5855_0.png) | A main speech bubble and smaller arrows/commentary complement contrasting poses. | Use one principal punchline plus restrained supporting cues; avoid giving every text element maximum weight. |

The [article](https://www.vgover.com/news/227900) is dated 2026-07-31; this is not the creation date of every meme. The [archive](https://github.com/EDMOK/blue-fish-archive) is a fan collection, not a popularity leaderboard or a blanket artwork license. No third-party character image is redistributed in this source package.

## Font choices

Three actual Chinese font families were verified in the official [google/fonts](https://github.com/google/fonts) repository:

- [ZCOOL KuaiLe](https://github.com/google/fonts/tree/main/ofl/zcoolkuaile): playful rounded display shapes.
- [Long Cang](https://github.com/google/fonts/tree/main/ofl/longcang): loose textured handwriting suitable for short asides.
- [Zhi Mang Xing](https://github.com/google/fonts/tree/main/ofl/zhimangxing): brush-like running script for a few emphatic words.

Each ships with its own copyright/OFL 1.1 text. Vendored revisions, URLs and SHA256 digests are recorded in `public/fonts/manifest.json`. These are our chosen usable fonts; we do not claim the source memes used them. The legacy classic font remains available.

## Persona-led original reactions

Margaret's selected adult persona is boastful, playful and teasing, but becomes flustered when seen through; her caring actions sometimes contradict her dismissive words. This is recorded in an editable `memePersona` brief and does not change her age, costume or identity.

Original new cases pair pose with a text decision: a smug challenge with integrated lettering, a caught bluff with interrupted speech, a small victory with editable lettering, and a quiet caring gesture that works without words. Old cute and full-body reactions stay available. A mixed pack uses all three text modes instead of putting an identical caption on every image.

Generated text is part of the image pixels. Selecting no text later only changes the next generation; it cannot erase baked letters. Post-render fonts remain editable and can be switched off independently for each image. Keep raw images, text-mode snapshots and exact generation prompts in the project history.

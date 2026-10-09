# 5th grade

Lessons and learning games for 5th graders. `index.html` is the folder page (linked from the home page);
each subject is one page here, built on the shared lesson engine in `../lesson.js` and `../lesson.css`:

| Page | Lessons | Games |
| --- | --- | --- |
| `reading-rights.html` | Esperanza Rising · Human rights (UDHR) · Work rights · Human dignity | Rights Defender |
| `math.html` | Multiplying big numbers · The standard algorithm · What is volume? · Volume formulas | Area Model Builder · Box Builder |
| `science.html` | Ecosystems · Nurse logs · Matter cycling | Carbon's Journey |
| `social-studies.html` | Why study history? · Perspective: timelines & maps · The Lost Colony of Roanoke | Time Detective |

Every lesson starts with **what is it?** and **why do we care?**, then explains the ideas one slide at a time,
each with an animated picture, and ends with a quiz. To add a subject, copy one of these pages, then add it to the
`SUBJECTS` list in `index.html` and a block to `tests/run.js`.

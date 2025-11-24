
RETROSPECTIVE DEMO 1 (Team 09)
=====================================
﻿
The retrospective should include _at least_ the following
sections:
﻿
- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)
﻿
## PROCESS MEASURES 
﻿
### Macro statistics
﻿
- Number of stories committed vs. done: 5 vs 5
- Total points committed vs. done: 15 vs 15
- Nr of hours planned vs. spent (as a team): 73h 30m vs 71h 20m 
﻿
**Remember** a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed
﻿
> Please refine your DoD if required (you cannot remove items!) 
﻿
### Detailed statistics
﻿
| Story            | # Tasks | Points | Hours est. | Hours actual |
|------------------|---------|--------|------------|--------------|
| _Uncategorized_  |    6    |   0    |     35h    |    30h 20m   |
| PT01             |    5    |   3    |   12h 30m  |    15h 30m   |
| PT02             |    6    |   2    |   10h 30m  |     9h 40m   |
| PT03             |    5    |   2    |    5h 30m  |     5h 20m   |
| PT04             |    2    |   5    |    3h      |     3h 30m   |
| PT05             |    5    |   3    |    8h 30m  |     8h       |
﻿
> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)
﻿
- Hours per task average, standard deviation (estimate and actual)
﻿

|                  | Mean    | StDev  |
|------------------|---------|--------|
| Estimation       | 2h 32m  | 2h 36m |
| Actual           | 2h 28m  | 3h 02m |

﻿
- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1
﻿
    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = -0.029$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n
﻿
    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.275$$
  
## QUALITY MEASURES 
﻿
- Unit Testing:
  - Total hours estimated: 6h
  - Total hours spent: 6h 20m
  - Nr of automated unit test cases: 110  
  - Coverage: 82.21%
- E2E testing:
  - Total hours estimated: 8h
  - Total hours spent: 7h 30m  
  - Nr of test cases: 37
- Code review 
  - Total hours estimated: 7h 30m  
  - Total hours spent: 3h 50m
  
﻿
﻿
## ASSESSMENT
﻿
- What did go wrong in the sprint?
  - Too many stories
  - Late finish
  - We did not reserve enough time to prepare the Demo presentation
  - Underestimated of UI tasks
﻿
- What caused your errors in estimation (if any)?
  - Lack of experience to create this kind of project from scratch
﻿
- What lessons did you learn (both positive and negative) in this sprint?
  - Positive: Learning new features about UI and OpenStreetMap
  - Positive: The importance of project organization from a folder and module organization
  - Negative: The time management is more important that we expected
  - Negative: Some code that we duplicted was already present
﻿
- Which improvement goals set in the previous retrospective were you able to achieve?
  - This was our first Demo
  From previous project team:
  - More comments
  - Comments more clear
  - Better choice of folder and code structure
  - Documentation
  
- Which ones you were not able to achieve? Why?
  - This was our first Demo
  - Estimation time, because of lack of experience
﻿
- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)
﻿
  > Propose one or two
  - Better estimation of time
  - Better organization of branches
﻿
- One thing you are proud of as a Team!!
  - Good team working and project is going well
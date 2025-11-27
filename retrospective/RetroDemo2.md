
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
- Number of stories committed vs. done: 4 vs 4
- Total points committed vs. done: 22 vs 22
- Nr of hours planned vs. spent (as a team): 79h vs 83h 50m 
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
| Story            | # Tasks | Points |  Hours est. | Hours actual |
|------------------|---------|--------|-------------|--------------|
| _Uncategorized_  |    16   |   0    |   43h 20m   |    43h 40m   |
| PT06             |    7    |   5    |   13h 30m   |    15h 15m   |
| PT07             |    5    |   13   |     7h      |      7h      |
| PT08             |    5    |   1    |    10h 30m  |     10h 10m  |
| PT09             |    5    |   3    |    7h       |     7h 30m   |
﻿
> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)
﻿
- Hours per task average, standard deviation (estimate and actual)
﻿

|                  | Mean    | StDev  |
|------------------|---------|--------|
| Estimation       | 2h 08m  | 2h 07m |
| Actual           | 2h 16m  | 2h 10m |

﻿
- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1
﻿
    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = 0.06 $$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n
﻿
    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.16 $$
  
## QUALITY MEASURES 
﻿
- Unit Testing:
  - Total hours estimated: 8h
  - Total hours spent: 8h 30m
  - Nr of automated unit test cases: 214
  - Coverage: 82.41%
- Integration Testing: 
  - Total hours estimated: 6h
  - Total hours spent: 5h 30m
  - Nr of automated unit test cases: 73
- E2E testing:
  - Total hours estimated: 4h
  - Total hours spent: 5h
  - Nr of test cases: 66
- Code refactor 
  - Total hours estimated: 2h
  - Total hours spent: 2h 30m
- Code review 
  - Total hours estimated: 9h 
  - Total hours spent: 8h 30m
  
﻿
﻿
## ASSESSMENT
﻿
- What did go wrong in the sprint?
  - We estimated 1 hour less at estimetion
  - Late finish for dockerizing
  - We did a another story that was not in the sprint
﻿
- What caused your errors in estimation (if any)?
  - We spent too much time in tasks regardint refactoring and dockerization
﻿
- What lessons did you learn (both positive and negative) in this sprint?
  - Positive: we learned how to work with docker
  - Positive: we learned how to test frontend with cypress
  - Negative: docker was more complicated than we excpected
﻿
- Which improvement goals set in the previous retrospective were you able to achieve?
  - Better estimation of time
  - Better organization of branches
  
- Which ones you were not able to achieve? Why?
  - Nothing
﻿
- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)
﻿
  > Propose one or two
  - Write better code using sonarqube
  - More coverage of tests
﻿
- One thing you are proud of as a Team!!
  - We are a cohesive and well-organized team
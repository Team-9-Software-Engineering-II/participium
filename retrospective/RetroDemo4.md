TEMPLATE FOR RETROSPECTIVE (Team 09)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs done : 5 vs 5
- Total points committed vs done : 26 vs 26
- Nr of hours planned vs spent (as a team) : 81h 30m vs 82h 35m

**Remember**  a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD 

### Detailed statistics

| Story   | # Tasks | Points  | Hours est.        | Hours actual |
|---------|---------|---------|-------------------|--------------|
|  _#0_   |    12   |    0    |      29h 30m      |    31h 45m   |
|   28    |     5   |    5    |      6h 30m       |    6h 30m    |
|   15    |     5   |    3    |      6h           |    5h 45m    |
|   30    |     5   |    5    |      7h           |    6h 45m    |
|   10    |     8   |    5    |      14h          |    14h 25m   |
|   11    |     10  |    8    |      18h 30m      |    17h 25m   |

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task (average, standard deviation)
  - average for estimation: 1h 49m
  - standard deviation for estimation: 1h 20m
  - average for spent time: 1h 50m
  - standard deviation for spent time: 1h 22m

- Total task estimation error ratio: sum of total hours estimation / sum of total hours spent -1:
  - -1.31%

  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated: 10h 30m
  - Total hours spent: 10h 15m
  - Nr of automated unit test cases: 433
  - Coverage (if available): 92%
- Integration testing:
  - Total hours estimated: 6h
  - Total hours spent: 6h
- E2E testing:
  - Total hours estimated: 7h 30m
  - Total hours spent: 7h 15m
- Code review: 
  - Total hours estimated: 7h
  - Total hours spent: 7h 45m 
- Technical Debt management:
  - Strategy adopted: 'A' rating for code maintainability, the CI/CD pipeline is configured with a Quality Gate threshold and any new code must pass this gate, reduce high impact code smell identified by SonarQube
  - Total hours estimated estimated at sprint planning: 4h 
  - Total hours spent: 4h
  


## ASSESSMENT

- What caused your errors in estimation (if any)?
  - no big errors, we did not considered a logic part in story 11

- What lessons did you learn (both positive and negative) in this sprint?
  - positive: we improved out time estimation
  - negative: we underestimate the organization of one task

- Which improvement goals set in the previous retrospective were you able to achieve? 
  - nothing

- Which ones you were not able to achieve? Why?
  - we did not finish earlier the whole work, due to some issues that came out in the last minutes

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

> Propose one or two

- One thing you are proud of as a Team!
  - we finished the project without any argument, and we collaborate each other for the whole time!
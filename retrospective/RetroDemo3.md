TEMPLATE FOR RETROSPECTIVE (Team ##)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs done : 4 vs 4
- Total points committed vs done : 21 vs 21 
- Nr of hours planned vs spent (as a team) : 80h vs 80h 15m

**Remember**  a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD 

### Detailed statistics

|      Story        | # Tasks | Points | Hours est. | Hours actual |
|-------------------|---------|--------|------------|--------------|
|      _#0_         |    12   |    0   |   28h 45m  |   27h 20m    |
|     _PT24_        |    9    |    5   |   13h      |   13h 5m     |
|     _PT25_        |    6    |    3   |   9h 30m   |   9h 50m     |
|     _PT26_        |    8    |    8   |   14h 30m  |   14h 30m    |
|     _PT27_        |    8    |    5   |   14h 15m  |   15h 30m    |
   

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task (average, standard deviation)
  - average: 1h 53m
  - standard deviation: 1h 26m
- Total task estimation error ratio: sum of total hours estimation / sum of total hours spent -1
  - -0.31%

  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated: 10h
  - Total hours spent: 10h 15m
  - Nr of automated unit test cases: 383
  - Coverage (if available): 94%
- Integration testing:
  - Total hours estimated: 7h 
  - Total hours spent: 7h 15m
- E2E testing:
  - Total hours estimated: 8h 30m
  - Total hours spent: 9h
- Code review: 
  - Total hours estimated: 10h 45m 
  - Total hours spent: 10h 45m
- Technical Debt management:
  - Strategy adopted: 'A' rating for code maintainability, the CI/CD pipeline is configured with a Quality Gate threshold and any new code must pass this gate, reduce high impact code smell identified by SonarQube
  - Total hours estimated estimated at sprint planning: 2h
  - Total hours spent: 2h
  


## ASSESSMENT

- What caused your errors in estimation (if any)?
  - no big errors in estimation, some little errors in testing tasks

- What lessons did you learn (both positive and negative) in this sprint?
  - positive: we improved our management of time in estimation.
  - positive: we learned how to use new technologies like nodemailer and redis.
  - negative: we could avoid to modify the code the evening before the Demo presentation, in order to not have problems with the tests

- Which improvement goals set in the previous retrospective were you able to achieve?
  - we reached a more coverage of test
  - we wrote better code using Sonarqube statistics
  
- Which ones you were not able to achieve? Why?
  - nothing

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)
  - we want to finish a little bit earlier the whole work

> Propose one or two

- One thing you are proud of as a Team!!
  - we are constantly improving in all aspects
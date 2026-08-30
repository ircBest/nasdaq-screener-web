NASDAQ IT Screener

NASDAQ IT 종목을 대상으로 기술적 지표와 재무 데이터를 결합하여 투자 후보군을 탐색하고, 발생한 Signal을 장기적으로 추적·검증하는 Automated Quantitative Research System

⸻

1. 프로젝트 소개

본 프로젝트는 NASDAQ 시장의 IT 관련 종목을 대상으로 정량적 조건을 적용하여 투자 후보 종목을 자동으로 탐색하는 Stock Screening & Research System입니다.

단순히 현재 시점의 종목을 선별하는 것에서 끝나지 않고,

Market Data 수집
      ↓
Screening
      ↓
Signal 생성
      ↓
결과 저장
      ↓
사후 성과 추적
      ↓
통계화
      ↓
Web Dashboard 표시

의 전체 과정을 자동화하는 것을 목표로 제작했습니다.

현재 시스템은 GitHub Actions를 이용하여 정기적으로 데이터를 수집하고 스크리닝을 수행하며, 생성된 Signal을 이후 거래일 동안 지속적으로 추적하여 실제 시장에서의 성과를 기록합니다.

⸻

2. 핵심 목표

이 프로젝트의 핵심 목표는 다음과 같습니다.

* NASDAQ IT 종목의 자동 탐색
* 정량적 조건을 이용한 후보 종목 필터링
* 반복적인 수작업 분석의 자동화
* Signal 발생 이후 실제 주가 움직임 추적
* 기간별 성과 데이터 축적
* 누적 Research 데이터를 이용한 전략 평가
* 웹 기반 Dashboard를 통한 결과 시각화

즉,

“오늘 어떤 종목이 조건을 만족하는가?”

뿐만 아니라,

“과거에 같은 조건을 만족했던 종목은 이후 실제로 어떻게 움직였는가?”

까지 확인할 수 있도록 설계했습니다.

⸻

3. System Architecture

                 ┌─────────────────────┐
                 │     Market Data     │
                 │       Source        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Data Collection   │
                 │ Proprietary Logic   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Stock Screening   │
                 │ Proprietary Logic   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Signal Creation   │
                 │ Proprietary Logic   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Research Data     │
                 │      Storage        │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Performance     │   │ BSI Calculation │
        │ Tracking        │   │ Proprietary     │
        │                 │   │ Research Logic  │
        └────────┬────────┘   └────────┬────────┘
                 │                     │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │    Web Dashboard    │
                 │                     │
                 │ HTML / CSS / JS     │
                 └─────────────────────┘

Note: Data Collection, Screening, Signal Generation 및 BSI 산출에 사용되는 핵심 구현과 Research Logic은 프로젝트의 핵심 기술 자산으로서 공개하지 않습니다.

⸻

4. 전체 동작 과정

STEP 1. Market Data 수집

시스템은 정해진 주기에 따라 NASDAQ 종목 데이터를 수집합니다.

수집되는 데이터에는 프로젝트 목적에 따라 다음과 같은 정보가 포함됩니다.

* 종목 코드
* 기업명
* 주가
* 거래량
* 시가총액
* 기술적 지표
* 재무 관련 데이터
* 기타 Screening에 필요한 정보

데이터 수집 및 전처리 과정은 이후 Screening에 사용할 수 있도록 검증 및 정규화됩니다.

Data Collection
      ↓
Data Validation
      ↓
Normalization
      ↓
Screening Dataset

데이터 수집 및 전처리의 세부 구현은 Proprietary Implementation으로 관리합니다.

⸻

5. STEP 2. Stock Screening

수집된 종목에 대해 사전에 정의한 정량적 조건을 순차적으로 적용합니다.

대표적으로 다음과 같은 데이터가 Screening에 활용됩니다.

Technical Conditions

* RSI
* 가격 움직임
* 거래량
* 기타 기술적 지표

Fundamental Conditions

* 시가총액
* 최근 재무 데이터
* 수익성 관련 지표

Risk Management

* 예상 손절 기준
* 예상 목표가
* Risk / Reward 관련 기준

세부적인 수식, Threshold 및 조건 조합은 프로젝트의 핵심 Research Logic이므로 공개하지 않습니다.

Screening Dataset
        ↓
Proprietary Screening Logic
        ↓
Qualified Candidates

⸻

6. STEP 3. Signal 생성

모든 종목이 Screening 조건을 만족하는 것은 아닙니다.

조건을 통과한 종목만 최종적으로 Research Signal로 기록합니다.

예시:

{
  "ticker": "XXXX",
  "name": "Example Company",
  "signal": "Proprietary",
  "rsi": "Proprietary",
  "price": "Example",
  "target": "Proprietary",
  "stop_loss": "Proprietary"
}

실제 Signal 생성 공식, 가중치 및 Threshold는 공개하지 않습니다.

중요한 점은 Signal을 단순히 현재 화면에 표시하는 것이 아니라 Research 대상으로 저장하고 이후 시장 데이터를 이용하여 지속적으로 추적한다는 것입니다.

⸻

7. STEP 4. Research Tracking

Signal이 생성된 이후 시스템은 해당 Signal을 즉시 평가하지 않습니다.

Signal 발생일을 기준으로 이후 거래일의 주가 데이터를 지속적으로 확인합니다.

예를 들어:

Signal 발생
     │
     ├── Day 1
     ├── Day 2
     ├── Day 3
     ├── Day 4
     ├── Day 5
     ├── Day 6
     ├── ...
     └── MAX

각 Signal은 시간이 지나면서 Completed 또는 Pending 상태로 관리됩니다.

이를 통해 과거 Signal이 실제 시장에서 어떠한 결과를 만들었는지를 지속적으로 축적합니다.

⸻

8. Research Performance

현재 Dashboard에서는 누적된 Signal을 기반으로 Research Performance를 계산합니다.

2026-08-30 기준

Metric	Value
완료 Signal	194
대기 Signal	257
전체 추적 Signal	451
5D 평균 수익률	-1.59%
5D 승률	34.54%
평균 승리	+3.40%
평균 손실	-4.23%

현재 데이터는 아직 모든 Signal의 관측 기간이 완료되지 않았기 때문에 일부 장기 기간의 통계는 충분한 표본이 확보될 때까지 Data Insufficient 상태로 관리합니다.

⸻

9. BSI · Backtest Signal Index

본 프로젝트에서는 누적된 Signal의 성과를 하나의 지표로 확인하기 위해 **BSI (Backtest Signal Index)**를 사용합니다.

BSI는 특정 기간 동안 발생한 Signal들이 이후 시장에서 어떠한 평균적인 움직임을 보였는지를 확인하기 위한 Research Metric입니다.

현재 Dashboard에서는 다음과 같은 기간을 제공합니다.

5D
10D
30D
60D
90D
1Y
5Y
MAX

각 기간에 충분한 관측 표본이 확보되어야 통계적 의미를 확보할 수 있으므로, 데이터가 부족한 기간은 자동으로 Data Insufficient 상태로 표시합니다.

현재 예:

5D   → -1.6%   / 194 samples
10D  → Data Insufficient
30D  → Data Insufficient
60D  → Data Insufficient
90D  → Data Insufficient
1Y   → Data Insufficient
5Y   → Data Insufficient
MAX  → +2.4%   / 422 samples

BSI의 세부 산출 공식은 Proprietary Research Logic으로 관리합니다.

⸻

10. Research Curve

Signal 발생 이후 평균적인 수익률 변화를 시간축으로 시각화합니다.

Signal
  │
  ├── Day 1
  ├── Day 2
  ├── Day 3
  ├── Day 4
  ├── Day 5
  ├── Day 6
  │
  ▼
Average Return Curve

현재 Dashboard에서는 예를 들어

Day 6 · -3.7%

와 같이 특정 시점의 누적 평균 성과를 확인할 수 있습니다.

이를 통해 단순한 최종 수익률뿐만 아니라 Signal 이후 시간이 지나면서 성과가 어떻게 변화하는지를 관찰할 수 있습니다.

⸻

11. 자동화 구조

본 프로젝트의 핵심 중 하나는 반복적인 Research 작업을 자동화했다는 점입니다.

전체적인 실행 구조는 다음과 같습니다.

GitHub Actions
       │
       ▼
Scheduled Workflow
       │
       ▼
Data Collection
       │
       ▼
Screening
       │
       ▼
Signal Generation
       │
       ▼
Research Data Update
       │
       ▼
Static Web Data Update
       │
       ▼
Web Dashboard

정해진 시간에 Workflow가 자동으로 실행되므로 사용자가 매일 직접 프로그램을 실행할 필요가 없습니다.

⸻

12. Web Frontend

Dashboard는 역할별로 분리된 구조로 구성되어 있습니다.

index.html
│
├── css/
│   └── style.css
│
└── js/
    ├── main.js
    ├── data.js
    ├── ui.js
    └── utils.js

index.html
웹 페이지의 기본 구조와 UI Element를 정의합니다.

style.css
Dashboard의 디자인과 반응형 UI를 담당합니다.

data.js
Research 및 Signal 데이터를 읽고 관리합니다.

ui.js
BSI, Performance, Statistics, Signal Results 등의 화면 렌더링을 담당합니다.

utils.js
공통적으로 사용되는 데이터 처리 및 보조 기능을 담당합니다.

main.js
전체 Frontend의 실행 흐름을 연결합니다.

⸻

13. 데이터와 Presentation의 분리

프로젝트에서는 데이터와 Presentation Layer를 의도적으로 분리했습니다.

Data
 │
 ├── Signal Data
 ├── Research Data
 ├── Performance Data
 └── BSI Data
          │
          ▼
      JavaScript
          │
          ▼
      UI Rendering
          │
          ▼
       Browser

따라서 데이터가 변경되더라도 HTML 전체를 다시 작성할 필요 없이 데이터 파일을 갱신하여 Dashboard에 반영할 수 있습니다.

이러한 구조를 통해 Research Data와 Presentation Layer의 결합도를 낮추고 유지보수성을 확보했습니다.

⸻

14. 현재 프로젝트 상태

2026-08-30 기준 Research Status

Total Signals       : 451
Completed Signals   : 194
Pending Signals     : 257
Completion Rate     : 43.0%

현재는 아직 Research 데이터가 축적되는 단계입니다.

따라서 현재의 통계값을 최종적인 투자 전략의 성능으로 해석하기보다는 Ongoing Research Result로 보는 것이 적절합니다.

특히 장기 기간의 성과는 충분한 관측 기간과 표본이 확보된 이후 평가할 예정입니다.

⸻

15. 현재 성과에 대한 해석

현재 5D 기준 성과는 다음과 같습니다.

Average Return : -1.59%
Win Rate       : 34.54%
Average Win    : +3.40%
Average Loss   : -4.23%

현재 결과만 놓고 보면 Signal의 단기 성과가 우수하다고 평가하기는 어렵습니다.

그러나 본 프로젝트의 목적은 특정 결과를 만들어내는 것뿐만 아니라 투자 가설을 정량적으로 검증할 수 있는 Research Infrastructure를 구축하는 것에 있습니다.

따라서 향후 데이터가 충분히 축적되면 Screening 조건 및 Parameter를 변경하고, 동일한 Research Pipeline을 통해 반복적으로 성과를 비교·검증할 수 있습니다.

현재의 부정적인 결과 또한 전략 개선을 위한 Research Data로 활용됩니다.

⸻

16. 향후 개발 계획

Phase 1 — Data Accumulation

* Signal 수 증가
* Research 데이터 지속 축적
* 기간별 표본 확보
* 데이터 품질 검증

Phase 2 — Strategy Research

* Screening 조건 비교
* Parameter Sensitivity Analysis
* 시장 상황별 성과 비교
* Sector별 성과 비교
* Benchmark 비교

Phase 3 — Risk Analysis

* Maximum Drawdown
* Sharpe Ratio
* Sortino Ratio
* Profit Factor
* Expectancy
* Volatility
* Risk-adjusted Return

Phase 4 — Research Platformization

* 데이터 파이프라인 안정화
* Logging / Monitoring
* Error Handling
* Version Management
* Reproducibility
* Backtesting Framework
* API 기반 데이터 제공
* 사용자별 Research Dashboard

⸻

17. 프로젝트의 핵심 의의

이 프로젝트는 단순한 주식 추천 프로그램을 만드는 것을 목표로 하지 않았습니다.

핵심은

투자 가설을 컴퓨터가 반복적으로 검증할 수 있는 환경을 만드는 것

입니다.

즉,

Hypothesis
    ↓
Quantitative Rule
    ↓
Screening
    ↓
Signal
    ↓
Observation
    ↓
Performance
    ↓
Statistics
    ↓
Strategy Evaluation
    ↓
Improvement

이라는 Research Cycle을 자동화하는 것을 목표로 합니다.

⸻

18. 기술 공개 범위

본 프로젝트는 포트폴리오 및 연구 목적으로 시스템의 구조와 Research 결과를 공개하지만, 다음 핵심 요소는 프로젝트의 지적 자산 보호를 위해 공개하지 않습니다.

* Signal 생성 알고리즘
* 세부 Screening Formula
* 내부 Parameter
* 일부 데이터 처리 로직
* Risk Management Formula
* BSI 산출 세부 알고리즘
* 일부 자동화 Pipeline 구현

해당 영역은 다음과 같이 Proprietary Research Logic으로 구분합니다.

Public Research Infrastructure
            │
            ├── Data Flow
            ├── Tracking Structure
            ├── Performance Metrics
            └── Web Visualization
                    │
                    ▼
        ┌────────────────────────┐
        │ Proprietary Research   │
        │        Logic           │
        ├────────────────────────┤
        │ Screening Algorithm    │
        │ Signal Generation      │
        │ Internal Parameters    │
        │ Risk Management        │
        │ BSI Calculation        │
        └────────────────────────┘

이는 단순히 코드를 숨기기 위한 것이 아니라, 프로젝트의 핵심 Research Logic과 Algorithm을 보호하면서 시스템의 구조와 검증 결과를 공개하기 위한 설계입니다.

⸻

19. Summary

본 프로젝트는 다음의 요소를 하나의 자동화된 Research System으로 통합했습니다.

Market Data
      ↓
Automated Screening
      ↓
Signal Generation
      ↓
Historical Research
      ↓
Performance Tracking
      ↓
Statistical Analysis
      ↓
Web Visualization
      ↓
Continuous Research

현재는 데이터 축적과 전략 검증이 진행 중이며, 향후 충분한 표본이 확보되면 더욱 다양한 통계적 검증과 Risk-adjusted Performance Analysis를 추가할 예정입니다.

본 프로젝트의 최종 목표는 특정 종목을 추천하는 것이 아니라, 정량적 투자 가설을 지속적으로 실험하고 검증할 수 있는 자동화된 Research Infrastructure를 구축하는 것입니다.

⸻

Author

개인 개발 프로젝트

NASDAQ IT Screener & Research System

Automated Screening · Quantitative Research · Performance Tracking · Data Visualization

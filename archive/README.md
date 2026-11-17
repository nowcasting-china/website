# Archive of predictions

Out-of-sample predictions of Chinese real GDP growth (percent, year on year) from the Bayesian dynamic factor model of Giannone, Miranda-Agrippino, Modugno and Zhang (2026), "Nowcasting China". 

## Files

| File | Content |
|---|---|
| `updates/predictions_<date>.csv` | One file per model update since September 2026. Each file holds the predictions made at that update and is never changed afterwards. |
| `predictions_latest.csv` | The newest update file. |
| `backtest_predictions.csv` | The backtest of the paper: 1,066 updates from 22 December 2007 to 1 September 2026. |

## Columns

| Column | Meaning |
|---|---|
| `vintage_date` | Date of the update: the model uses the data released up to and including this day. |
| `update_of_day` | 1, or 2 on the few days with two releases at different hours. |
| `target` | The period predicted: a quarter such as `2026Q4`, or a year for the annual rate. |
| `type` | `backcast` (the previous quarter, while its GDP is unpublished), `nowcast` (the current quarter), `forecast_1q`, `forecast_2q`, `forecast_3q` (one to three quarters ahead), `annual` (the annual growth rate of the current year implied by the model). |
| `median` | Median of the predictive density. |
| `q05` ... `q95` | Quantiles of the predictive density: 5, 10, 16, 84, 90 and 95 percent. The 68 percent interval is `q16` to `q84`. |

## Real time

The update files are produced when the data are released. The backtest replays the release calendar: at each date the model sees only the observations published by then. Revision histories are used for GDP and exports; for the other series the backtest uses the values as currently published.

# Nowcasting China

**Live site:** [https://nowcasting-china.github.io/website/](https://nowcasting-china.github.io/website/)

An interactive dashboard of real-time nowcasts of China's real GDP growth, based on a Bayesian **dynamic factor model** with heterogeneous dynamics, time-varying trends, stochastic volatility and outlier adjustments. The model is estimated on a dataset of eleven series: real GDP growth and ten timely monthly and quarterly indicators of Chinese activity (industrial production, retail sales, electricity production, new construction, exports, freight traffic, the NBS manufacturing and non-manufacturing PMIs, the RatingDog manufacturing PMI, and the business climate index).

The dashboard shows:

- **Quarterly Year over Year Growth**: the history of the quarterly GDP growth nowcast and its credible bands; for each target quarter, the predictive density of the latest estimate, the impact of each data release on the nowcast, and the data flow.
- **Annual rate**: the model's estimate of annual GDP growth with its predictive density, compared with the forecasts of the IMF, OECD, Asian Development Bank and World Bank and with the government growth target; for each year, the impact of each data release on the annual rate.
- **FAQ**: the data used, the model's equations, and the release calendar.

Results are updated at every data release. For each release, the data-flow tables show the released value, the model's forecast of it, the news (the difference between the two), its weight and its impact on the nowcast.

## Archive of predictions

The [`archive`](archive) folder holds the predictions for download: one file per model update with the backcast, the nowcast, the forecasts one to three quarters ahead and the annual rate, each with its median and quantiles, together with the backtest of the paper since December 2007. A new file is added at every update.

## Citation

If you use the results or figures from this dashboard, please cite:

> Giannone, D., Miranda-Agrippino, S., Modugno, M., and Zhang, W. (2026). *Nowcasting China*. Working paper.

```bibtex
@unpublished{giannone2026nowcasting,
  author = {Giannone, Domenico and Miranda-Agrippino, Silvia and Modugno, Michele and Zhang, Wei},
  title  = {Nowcasting China},
  note   = {Working paper},
  year   = {2026}
}
```

## Acknowledgment

The dashboard design builds on [recessionrisk.com](https://recessionrisk.com) by Francesco Furno and Domenico Giannone.

## Data sources

NBS, MOT, S&P Global via Haver Analytics; retail sales, non-manufacturing PMI and the GDP and exports revision histories via Macrobond. Institution benchmarks are collected manually from IMF, OECD, WB and ADB.

## Declaration on the use of generative AI

The code for this website and its update pipeline was written with the assistance of Claude Code, a generative AI coding tool developed by Anthropic. The econometric model, its specification and priors, the choice of data, and the interpretation of the results are the work of the authors. All AI-assisted suggestions were carefully reviewed, and we take full responsibility for the final content and accuracy of this site.

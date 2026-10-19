# Nowcasting China

**Live site:** [https://nowcasting-china.github.io/website/](https://nowcasting-china.github.io/website/)

An interactive dashboard of real-time nowcasts of China's real GDP growth, based on a Bayesian **dynamic factor model** with heterogeneous dynamics, time-varying trends, stochastic volatility and outlier adjustments. The model is estimated on a panel of eleven series: real GDP growth and ten timely monthly and quarterly indicators of Chinese activity (industrial production, retail sales, electricity production, new construction, exports, freight traffic, the NBS manufacturing and non-manufacturing PMIs, the RatingDog manufacturing PMI, and the business climate index).

The dashboard shows:

- **Nowcast**: the history of the quarterly GDP growth nowcast and its credible bands; for each target quarter, the predictive density of the latest estimate, the impact of each data release on the nowcast, and the data flow.
- **Annual rate**: the model's estimate of annual GDP growth with its predictive density, compared with the forecasts of the IMF, OECD, Asian Development Bank and World Bank and with the government growth target; for each year, the impact of each data release on the annual rate.
- **FAQ**: the data used, the model's equations, and the release calendar.

Results are updated at every data release. The site shows model results only; the released values of the indicators are not published here.

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

National Bureau of Statistics (GDP, industrial production, retail sales, electricity production, new construction, manufacturing and non-manufacturing PMIs, business climate index); General Administration of Customs (exports); Ministry of Transport (freight traffic); S&P Global (RatingDog manufacturing PMI). Institution benchmarks are collected manually.

## Declaration on the use of generative AI

The code for this website and its update pipeline was written with the assistance of Claude Code, a generative AI coding tool developed by Anthropic. This covers the scripts that check for new data releases, run the model at each release, export the results, build the dashboard and publish it to this repository. The econometric model, its specification and priors, the choice of data, and the interpretation of the results are the work of the authors. The authors reviewed the AI-assisted code and checked its output against the model's own results, and they take full responsibility for the content of this site.

// @flow
import BuildInfo from './BuildInfo';
import Comparisons from './Comparisons';
import deepEqual from 'deep-equal';
import Chart from './charts/Chart';
import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import theme from './theme';
import Toggles from './Toggles';
import { bundlesBySize, statsForBundles } from './stats';
import { interpolateRainbow, scaleSequential } from 'd3-scale';
import { ChartType, ValueType, valueTypeAccessor, XScaleType, YScaleType } from './values';

import type { Match, RouterHistory } from 'react-router-dom';
import type { Build, Bundle } from './types';

const colorScale = scaleSequential(interpolateRainbow).domain([0, bundlesBySize.length]);

const _getActiveBundles = (props: Object): Array<string> => {
  const { match: { params } } = props;
  const { bundleNames } = params;
  if (!bundleNames) {
    return bundlesBySize;
  } else {
    const bundles = bundleNames.split('+');
    return bundlesBySize.filter(b => bundles.indexOf(b) !== -1);
  }
};

class App extends Component {
  state: {
    builds: Array<Build>,
    chart: $Values<typeof ChartType>,
    hoveredBundle?: string,
    selectedBuild?: Build,
    values: $Values<typeof ValueType>,
    xscale: $Values<typeof XScaleType>,
    yscale: $Values<typeof YScaleType>
  };

  props: {
    history: RouterHistory,
    match: Match
  };

  _activeBundles: Array<string>;
  _stats: Array<Build>;

  constructor(props: Object, context: Object) {
    super(props, context);
    this.state = {
      builds: [],
      chart: ChartType.AREA,
      values: ValueType.GZIP,
      xscale: XScaleType.COMMIT,
      yscale: YScaleType.LINEAR
    };
    this._activeBundles = _getActiveBundles(props);
    this._stats = statsForBundles(bundlesBySize);
  }

  componentWillUpdate(nextProps: Object, nextState: Object) {
    if (!deepEqual(this.props.match.params, nextProps.match.params)) {
      this._activeBundles = _getActiveBundles(nextProps);
    }
    if (!deepEqual(this.state.bundles, nextState.bundles)) {
      this._stats = statsForBundles(nextState.bundles);
    }
  }

  render() {
    const { builds, chart, hoveredBundle, selectedBuild, values, xscale, yscale } = this.state;
    const sortedBuilds = builds.sort((a, b) => a.meta.timestamp - b.meta.timestamp);
    return (
      <View style={styles.root}>
        <View style={styles.main}>
          <View style={styles.scaleTypeButtons}>
            <Toggles
              chartType={chart}
              onToggle={this._handleToggleValueTypes}
              valueType={values}
              xScaleType={xscale}
              yScaleType={yscale}
            />
          </View>
          <View style={styles.innerMain}>
            <View style={styles.chartRoot}>
              <View style={styles.chart}>
                <Chart
                  activeBundles={this._activeBundles}
                  bundles={bundlesBySize}
                  chartType={chart}
                  colorScale={colorScale}
                  onHover={this._handleHover}
                  onSelectBuild={this._handleSelectBuild}
                  selectedBuilds={builds.map(b => b.meta.revision)}
                  valueAccessor={valueTypeAccessor[values]}
                  xScaleType={xscale}
                  yScaleType={yscale}
                  stats={this._stats}
                />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.data}>
          <View style={styles.table}>
            <Comparisons
              activeBundles={this._activeBundles}
              builds={sortedBuilds}
              bundles={bundlesBySize}
              colorScale={colorScale}
              hoveredBundle={hoveredBundle}
              onBundlesChange={this._handleBundlesChange}
              onRemoveBuild={this._handleRemoveRevision}
              onShowBuildInfo={this._handleShowBuildInfo}
              valueAccessor={valueTypeAccessor[values]}
            />
          </View>
          <View style={styles.info}>
            {selectedBuild ? <BuildInfo build={selectedBuild} /> : null}
          </View>
        </View>
      </View>
    );
  }

  _handleToggleValueTypes = (toggleType: string, value: string) => {
    this.setState({ [toggleType]: value });
  };

  _handleHover = (bundle?: Bundle) => {
    if (bundle) {
      this.setState({ hoveredBundle: bundle.key });
    }
  };

  _handleBundlesChange = (bundles: Array<string>) => {
    this.props.history.push(
      bundles.length && bundles.length !== bundlesBySize.length ? `/${bundles.filter(b => b !== 'All').join('+')}` : '/'
    );
  };

  _handleSelectBuild = (build: Build, bundleName: string) => {
    this.setState({
      builds: [...this.state.builds, build],
      selectedBuild: build
    });
  };

  _handleRemoveRevision = (revision: string) => {
    this.setState(() => ({
      builds: this.state.builds.filter(build => build.meta.revision !== revision),
      selectedBuild: this.state.builds.length && this.state.builds[0]
    }));
  };

  _handleShowBuildInfo = (revision: string) => {
    this.setState(() => ({ selectedBuild: this.state.builds.find(build => build.meta.revision === revision) }));
  };
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: '100vh',
    position: 'absolute',
    width: '100vw',
    top: 0,
    left: 0
  },
  data: {
    flexGrow: 0,
    minWidth: `${2 * (100 / theme.columns)}%`,
    maxWidth: `${6 * (100 / theme.columns)}%`,
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftColor: theme.colorGray
  },
  table: {
    overflowY: 'scroll',
    minHeight: '50vh',
    maxHeight: '80vh',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: theme.colorGray
  },
  info: {
    flexGrow: 1,
    minHeight: '20vh',
    maxHeight: '50vh',
    margin: theme.spaceSmall
  },
  main: {
    height: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    flexGrow: 1
  },
  innerMain: {
    flexGrow: 1
  },
  chartRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    minHeight: '100%',
    width: '100%'
  },
  chart: {
    flexGrow: 1
  },
  scaleTypeButtons: {
    flex: 0,
    marginTop: theme.spaceSmall,
    marginRight: theme.spaceSmall,
    marginBottom: theme.spaceSmall
  }
});

export default App;

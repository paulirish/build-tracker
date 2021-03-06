/**
 * Copyright (c) 2019 Paul Armstrong
 */
import Comparator from '@build-tracker/comparator';
import { Actions, GraphType, State } from './types';

const getActiveComparator = (
  comparedRevisions: State['comparedRevisions'],
  budgets: State['budgets'],
  builds: State['builds'],
  artifactConfig: State['artifactConfig']
): Comparator => {
  return new Comparator({
    artifactBudgets: artifactConfig.budgets,
    artifactFilters: artifactConfig.filters,
    budgets: budgets,
    builds: builds.filter(build => comparedRevisions.includes(build.getMetaValue('revision'))),
    groups: artifactConfig.groups
  });
};

export default function reducer(state: State, action: Actions): State {
  switch (action.type) {
    case 'ARTIFACT_SET_ACTIVE': {
      const activeArtifacts = action.meta.reduce(
        (memo, artifactName) => {
          memo[artifactName] = action.payload;
          return memo;
        },
        { ...state.activeArtifacts }
      );
      return { ...state, activeArtifacts };
    }

    case 'BUILDS_SET': {
      const { budgets: artifactBudgets, filters, groups } = state.artifactConfig;
      const builds = action.payload;
      const comparator = new Comparator({
        artifactBudgets,
        artifactFilters: filters,
        budgets: state.budgets,
        builds,
        groups
      });

      const currentKeys = Object.keys(state.activeArtifacts).some(key => comparator.artifactNames.includes(key));
      const activeArtifacts = comparator.artifactNames.reduce((memo, artifactName) => {
        memo[artifactName] = currentKeys ? !!state.activeArtifacts[artifactName] : true;
        return memo;
      }, {});

      const newRevisions = comparator.builds.map(build => build.getMetaValue('revision'));
      const activeComparator = state.comparedRevisions.every(rev => newRevisions.includes(rev))
        ? getActiveComparator(state.comparedRevisions, state.budgets, builds, state.artifactConfig)
        : null;

      const graphType = builds.length <= 10 ? GraphType.STACKED_BAR : state.graphType;

      const sizeKey = comparator.sizeKeys.includes(state.sizeKey)
        ? state.sizeKey
        : comparator.sizeKeys.includes(state.defaultSizeKey)
        ? state.defaultSizeKey
        : comparator.sizeKeys[0];
      return { ...state, activeComparator, activeArtifacts, builds, comparator, graphType, sizeKey };
    }

    case 'COLOR_SCALE_SET':
      return { ...state, colorScale: action.payload };

    case 'COMPARED_REVISION_ADD': {
      const comparedRevisions = [...state.comparedRevisions, action.payload];
      return {
        ...state,
        activeComparator: getActiveComparator(comparedRevisions, state.budgets, state.builds, state.artifactConfig),
        comparedRevisions
      };
    }

    case 'COMPARED_REVISION_REMOVE': {
      const comparedRevisions = state.comparedRevisions.filter(rev => rev !== action.payload);
      return {
        ...state,
        activeComparator: getActiveComparator(comparedRevisions, state.budgets, state.builds, state.artifactConfig),
        comparedRevisions,
        focusedRevision: state.focusedRevision === action.payload ? undefined : state.focusedRevision
      };
    }

    case 'COMPARED_REVISION_CLEAR':
      return { ...state, activeComparator: null, comparedRevisions: [], focusedRevision: undefined };

    case 'SET_FOCUSED_REVISION':
      return { ...state, focusedRevision: action.payload || undefined };

    case 'SET_DISABLED_ARTIFACTS':
      return { ...state, disabledArtifactsVisible: action.payload };

    case 'SET_SIZE_KEY':
      return { ...state, sizeKey: action.payload };

    case 'ADD_SNACK':
      return { ...state, snacks: [...state.snacks, action.payload] };

    case 'REMOVE_SNACK':
      return { ...state, snacks: state.snacks.filter(msg => msg !== action.payload) };

    case 'HOVER_ARTIFACTS':
      if (
        state.hoveredArtifacts.length === action.payload.length &&
        action.payload.every(value => state.hoveredArtifacts.includes(value))
      ) {
        return state;
      }
      return { ...state, hoveredArtifacts: action.payload };

    case 'SET_FETCH_STATE':
      return { ...state, fetchState: action.payload };

    case 'SET_GRAPH_TYPE':
      return { ...state, graphType: action.payload };

    default:
      return state;
  }
}

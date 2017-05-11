import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/withLatestFrom';
import { toPayload, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';

import { Entities } from './entity.model';
import { typeFor } from '../util';
import { actions, EntityAction } from './entity.actions';
import * as EntityActions from './entity.actions';

export function addToStore<T>(state: Entities<T>, action: EntityActions.Add<T> | EntityActions.Load<T>): Entities<T> {
    const entities = Object.assign({}, state.entities);
    entities[action.payload.id] = reduceOne(state, null, action);
    return Object.assign({}, state, {
        ids: Object.keys(entities),
        entities,
        selectedEntityId: action.payload.id,
        loaded: true,
        loading: false,
    });
};

/**
 * Called after response from an add request returns from the server
 */
export function addSuccess<T>(state: Entities<T>, action: EntityActions.AddTemp<T>): Entities<T> {
    const entities = Object.assign({}, state.entities);
    let optimisticObject = entities[EntityActions.TEMP] || null;
    entities[action.payload.id] = reduceOne(state, optimisticObject, action);
    entities[EntityActions.TEMP] && delete entities[EntityActions.TEMP];
    return Object.assign({}, state, {
        ids: Object.keys(entities),
        entities,
        selectedEntityId: action.payload.id,
        loaded: true,
        loading: false,
    });
};
/*
 * Delete the property from state.entities, the element from state.ids and
 * if the one being deleted is the selectedEntity, then select a different one.
 */
export function deleteEntity<T>(state: Entities<T>, action: EntityActions.Delete<T> | EntityActions.DeleteTemp<T>): Entities<T> {
    const entities = Object.assign({}, state.entities);
    delete entities[action.payload.id];
    let idx = state.ids.indexOf(action.payload.id);
    let lastIdx = state.ids.length > 1 ? state.ids.length - 2 : null
    let newIdx = idx > 0 ? idx - 1 : lastIdx;
    const selectedEntityId = idx === -1 ? state.selectedEntityId : state.ids[newIdx];
    const i = state.ids.findIndex((id) => id == action.payload.id);
    const ids = [...state.ids.slice(0, i), ...state.ids.slice(i + 1)];
    return Object.assign({}, state, { entities, ids, selectedEntityId });
};

/**
 * Called from OnDestroy hooks to remove unsaved records with TEMP ID
 */
export function deleteTemp<T>(state: Entities<T>, action: EntityActions.DeleteTemp<T>): Entities<T> {
    const entities = Object.assign({}, state.entities);
    if (entities[action.payload.id]) {
        return deleteEntity<T>(state, action);
    }
}

export function select<T>(state: Entities<T>, action: EntityActions.Select<T>): Entities<T> {
    return Object.assign({}, state, {
        selectedEntityId: action.payload.id || action.payload
    });
};

export function selectNext<T>(state: Entities<T>, action: EntityActions.SelectNext<T>): Entities<T> {
    let ix = 1 + state.ids.indexOf(state.selectedEntityId);
    if (ix >= state.ids.length) { ix = 0; }
    return Object.assign({}, state, { selectedEntityId: state.ids[ix] });
};

/**
 * Add entities in the action's payload into the state if they are not yet there
 *
 * @param state
 * @param action
 */
export function union<T>(state: Entities<T>, action: EntityActions.LoadSuccess<T>) {
    const entities = action.payload;
    let newEntities = entities.filter((entity) => !state.entities[entity.id]);

    const newEntityIds = newEntities.map((entity) => entity.id);
    newEntities = newEntities.reduce((entities: { [id: string]: T }, entity: T) => {
        return Object.assign(entities, {
            [entity['id']]: entity
        });
    }, {});

    return Object.assign({}, state, {
        ids: [...state.ids, ...newEntityIds],
        entities: Object.assign({}, state.entities, newEntities),
        selectedEntityId: state.selectedEntityId
    });
}

export function update<T>(state: Entities<T>, action: EntityActions.Update<T>): Entities<T> {
    const entities = Object.assign({}, state.entities);
    entities[action.payload.id] = reduceOne(state, entities[action.payload.id], action);
    return Object.assign({}, state, {
        ids: Object.keys(entities),
        entities
    });
};

export function updateEach<T>(state: Entities<T>, action: any): Entities<T> {
    let id: string;
    const entities = Object.assign({}, state.entities);
    for (id in entities) {
        entities[id] = Object.assign(entities[id], action.payload);
    }
    return Object.assign({}, state, {
        entities
    });
};

function reduceOne<T>(state: Entities<T>, entity: T = null, action: EntityAction<T>): T {
    // console.log('reduceOne entity:' + JSON.stringify(entity) + ' ' + action.type)
    switch (action.type) {

        case typeFor(state.slice, actions.ADD):
        case typeFor(state.slice, actions.ADD_TEMP):
        case typeFor(state.slice, actions.ADD_OPTIMISTICALLY):
            return Object.assign({}, state.initialEntity, action.payload, { dirty: true });
        case typeFor(state.slice, actions.UPDATE):
            if (entity['id'] == action.payload.id) {
                return Object.assign({}, entity, action.payload, { dirty: true });
            } else {
                return entity;
            }
        case typeFor(state.slice, actions.ADD_SUCCESS):
            // entity could be an client-side-created object with client side state not returned by
            // the server. If so, preserve this state.
            return Object.assign({}, state.initialEntity, entity, action.payload, { dirty: false });
        case typeFor(state.slice, actions.LOAD_SUCCESS):
            return Object.assign({}, state.initialEntity, action.payload, { dirty: false });
        case typeFor(state.slice, actions.UPDATE_SUCCESS):
            if (entity['id'] == action.payload.id) {
                return Object.assign({}, entity, { dirty: false });
            } else {
                return entity;
            }
        default:
            return entity;
    }
};

/**
 *
 * Effects
 *
 */

export function loadFromRemote$(actions$: Actions, slice: string, dataService): Observable<Action> {
    return actions$
        .ofType(typeFor(slice, actions.LOAD))
        .startWith(new EntityActions.Load(slice, null))
        .switchMap(() =>
            dataService.getEntities(slice)
                .mergeMap((fetchedEntities) => Observable.from(fetchedEntities))
                .map((fetchedEntity) => new EntityActions.LoadSuccess(slice, fetchedEntity))  // one action per entity
                .catch((err) => {
                    console.log(err);
                    return Observable.of(new EntityActions.AddUpdateFail(slice, null));
                })
        );
}

export function addToRemote$(actions$: Actions, slice: string, dataService, store): Observable<Action> {
    return actions$
        .ofType(typeFor(slice, actions.ADD), typeFor(slice, actions.ADD_OPTIMISTICALLY))
        .withLatestFrom(store.select(slice))
        .switchMap(([action, entities]) =>
            Observable
                .from((<any>entities).ids)
                .filter((id: string) => (<any>entities).entities[id].dirty)
                .switchMap((id: string) => dataService.add(action.payloadForPost(), slice))
                .map((responseEntity) => new EntityActions.AddSuccess(slice, responseEntity))
        );
}

export function updateToRemote$(actions$: Actions, slice: string, dataService, store): Observable<Action> {
    return actions$
        .ofType(typeFor(slice, actions.UPDATE))
        .withLatestFrom(store.select(slice))
        .switchMap(([{ }, entities]) =>  // first element is action, but it isn't used
            Observable
                .from((<any>entities).ids)
                .filter((id: string) => (<any>entities).entities[id].dirty)
                .switchMap((id: string) => dataService.update((<any>entities).entities[id], slice))
                .map((responseEntity) => new EntityActions.UpdateSuccess(slice, responseEntity))
        );
}

export function deleteFromRemote$(actions$: Actions, slice: string, dataService, store): Observable<Action> {
    return actions$
        .ofType(typeFor(slice, actions.DELETE))
        .withLatestFrom(store.select(slice))
        .switchMap(([{ }, entities]) =>  // first element is action, but it isn't used
            Observable
                .from((<any>entities).ids)
                .switchMap((id: string) => dataService.remove((<any>entities).entities[id], slice))
                .map((responseEntity) => new EntityActions.UpdateSuccess(slice, responseEntity))
        );
}

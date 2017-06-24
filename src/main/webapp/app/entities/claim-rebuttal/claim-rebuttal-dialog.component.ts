import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Response } from '@angular/http';

import { Observable } from 'rxjs/Rx';
import { NgbActiveModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { JhiEventManager, JhiAlertService } from 'ng-jhipster';

import { ClaimRebuttal } from './claim-rebuttal.model';
import { ClaimRebuttalPopupService } from './claim-rebuttal-popup.service';
import { ClaimRebuttalService } from './claim-rebuttal.service';

@Component({
    selector: 'jhi-claim-rebuttal-dialog',
    templateUrl: './claim-rebuttal-dialog.component.html'
})
export class ClaimRebuttalDialogComponent implements OnInit {

    claimRebuttal: ClaimRebuttal;
    authorities: any[];
    isSaving: boolean;

    constructor(
        public activeModal: NgbActiveModal,
        private alertService: JhiAlertService,
        private claimRebuttalService: ClaimRebuttalService,
        private eventManager: JhiEventManager
    ) {
    }

    ngOnInit() {
        this.isSaving = false;
        this.authorities = ['ROLE_USER', 'ROLE_ADMIN'];
    }

    clear() {
        this.activeModal.dismiss('cancel');
    }

    save() {
        this.isSaving = true;
        if (this.claimRebuttal.id !== undefined) {
            this.subscribeToSaveResponse(
                this.claimRebuttalService.update(this.claimRebuttal), false);
        } else {
            this.subscribeToSaveResponse(
                this.claimRebuttalService.create(this.claimRebuttal), true);
        }
    }

    private subscribeToSaveResponse(result: Observable<ClaimRebuttal>, isCreated: boolean) {
        result.subscribe((res: ClaimRebuttal) =>
            this.onSaveSuccess(res, isCreated), (res: Response) => this.onSaveError(res));
    }

    private onSaveSuccess(result: ClaimRebuttal, isCreated: boolean) {
        this.alertService.success(
            isCreated ? 'greatBigExampleApplicationApp.claimRebuttal.created'
            : 'greatBigExampleApplicationApp.claimRebuttal.updated',
            { param : result.id }, null);

        this.eventManager.broadcast({ name: 'claimRebuttalListModification', content: 'OK'});
        this.isSaving = false;
        this.activeModal.dismiss(result);
    }

    private onSaveError(error) {
        try {
            error.json();
        } catch (exception) {
            error.message = error.text();
        }
        this.isSaving = false;
        this.onError(error);
    }

    private onError(error) {
        this.alertService.error(error.message, null, null);
    }
}

@Component({
    selector: 'jhi-claim-rebuttal-popup',
    template: ''
})
export class ClaimRebuttalPopupComponent implements OnInit, OnDestroy {

    modalRef: NgbModalRef;
    routeSub: any;

    constructor(
        private route: ActivatedRoute,
        private claimRebuttalPopupService: ClaimRebuttalPopupService
    ) {}

    ngOnInit() {
        this.routeSub = this.route.params.subscribe((params) => {
            if ( params['id'] ) {
                this.modalRef = this.claimRebuttalPopupService
                    .open(ClaimRebuttalDialogComponent, params['id']);
            } else {
                this.modalRef = this.claimRebuttalPopupService
                    .open(ClaimRebuttalDialogComponent);
            }
        });
    }

    ngOnDestroy() {
        this.routeSub.unsubscribe();
    }
}

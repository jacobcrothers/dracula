import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NgbActiveModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { JhiAlertService, JhiEventManager } from 'ng-jhipster';

import { Claim } from './claim.model';
import { ClaimPopupService } from './claim-popup.service';
import { ClaimService } from './claim.service';

@Component({
    selector: 'jhi-claim-delete-dialog',
    templateUrl: './claim-delete-dialog.component.html'
})
export class ClaimDeleteDialogComponent {

    claim: Claim;

    constructor(
        private claimService: ClaimService,
        public activeModal: NgbActiveModal,
        private alertService: JhiAlertService,
        private eventManager: JhiEventManager
    ) {
    }

    clear() {
        this.activeModal.dismiss('cancel');
    }

    confirmDelete(id: number) {
        this.claimService.delete(id).subscribe((response) => {
            this.eventManager.broadcast({
                name: 'claimListModification',
                content: 'Deleted an claim'
            });
            this.activeModal.dismiss(true);
        });
        this.alertService.success('greatBigExampleApplicationApp.claim.deleted', { param : id }, null);
    }
}

@Component({
    selector: 'jhi-claim-delete-popup',
    template: ''
})
export class ClaimDeletePopupComponent implements OnInit, OnDestroy {

    modalRef: NgbModalRef;
    routeSub: any;

    constructor(
        private route: ActivatedRoute,
        private claimPopupService: ClaimPopupService
    ) {}

    ngOnInit() {
        this.routeSub = this.route.params.subscribe((params) => {
            this.modalRef = this.claimPopupService
                .open(ClaimDeleteDialogComponent, params['id']);
        });
    }

    ngOnDestroy() {
        this.routeSub.unsubscribe();
    }
}

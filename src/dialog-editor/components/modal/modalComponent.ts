import * as _ from 'lodash';
import * as ng from 'angular';
import {__} from '../../../common/translateFunction';

/**
 * Controller for the Dialog Editor modal service
 * @memberof miqStaticAssets
 * @ngdoc controller
 * @name ModalController
 */
class ModalController {
  public modalTab: string = 'element_information';
  public modalData: any;
  public dynamicFieldList: any;
  public categories: any;
  public modalTitle: string;
  public modalOptions: any;
  public visible: boolean;
  public elementInfo: any;
  private uibModalInstance;

  /*@ngInject*/
  constructor(private $uibModal: any,
              private API: any,
              private DialogEditor: any) {
  }

  public loadModalData(elem: any) {
    if (elem !== undefined) {
      // clone data from service
      let elements = {
        tab: this.loadModalTabData(elem.tabId),
        box: this.loadModalBoxData(elem.tabId, elem.boxId),
        field: this.loadModalFieldData(elem.tabId, elem.boxId, elem.fieldId)
      };
      this.modalData = elem.type in elements &&
        _.cloneDeep(elements[elem.type]);

      if (elem.type === 'field') {
        this.modalData.dynamicFieldList = this.DialogEditor.getDynamicFields(this.modalData.id);

        // load categories from API, if the field is Tag Control
        if (this.modalData.type === 'DialogFieldTagControl') {
          this.resolveCategories().then(
            (categories: any) => { this.categories = categories; }
          );
        }
        // set modal title
        if (!this.modalData.dynamic) {
          const titles = {
            DialogFieldTextBox:         __('Text Box'),
            DialogFieldTextAreaBox:     __('Text Area'),
            DialogFieldCheckBox:        __('Check Box'),
            DialogFieldDropDownList:    __('Dropdown'),
            DialogFieldRadioButton:     __('Radio Button'),
            DialogFieldDateControl:     __('Datepicker'),
            DialogFieldDateTimeControl: __('Timepicker'),
            DialogFieldTagControl:      __('Tag Control')
          };
          const titleLabel = this.modalData.type in titles &&
            titles[this.modalData.type];
          this.modalTitle =  __(`Edit ${titleLabel} Field`);
        }
      }
    }
  }

  public loadModalTabData(tab: number) {
    if (typeof tab !== 'undefined') {
      let tabList = this.DialogEditor.getDialogTabs();
      return tabList[tab];
    }
  }

  public loadModalBoxData(tab: number, box: number) {
    if (typeof tab !== 'undefined' &&
        typeof box !== 'undefined') {
      let tabList = this.DialogEditor.getDialogTabs();
      let boxList = tabList[tab];
      return boxList.dialog_groups[box];
    }
  }

  public loadModalFieldData(tab: number, box: number, field: number) {
    if (typeof tab !== 'undefined' &&
        typeof box !== 'undefined' &&
        typeof field !== 'undefined') {
      let tabList = this.DialogEditor.getDialogTabs();
      let boxList = tabList[tab];
      let fieldList = boxList.dialog_groups[box];
      return fieldList.dialog_fields[field];
    }
  }

  /**
   * Load categories data from API.
   * @memberof ModalController
   * @function resolveCategories
   */
  public resolveCategories() {
    return this.API.get('/api/categories' +
                        '?expand=resources' +
                        '&attributes=description,single_value,children');
  }

  /**
   * Store the name of the tab, that is currently selected.
   * @memberof ModalController
   * @function modalTabSet
   * @param tab is a name of the tab in the modal
   */
  public modalTabSet(tab: string) {
    this.modalTab = tab;
  }

  /**
   * Watches attribute 'modalOptions', and if it changes,
   * calls method to display the modal.
   * @memberof ModalController
   * @function $onChanges
   */
  public $onChanges(changesObj: any) {
    if (changesObj.modalOptions && this.modalOptions) {
      this.showModal(this.modalOptions);
    }
  }

  /**
   * Returns true/false according to which tab is currently
   * selected in the modal.
   * @memberof ModalController
   * @function modalTabIsSet
   */
  public modalTabIsSet(tab: string) {
    return this.modalTab === tab;
  }

  /**
   * Check for changes in the modal.
   * @memberof ModalController
   * @function modalUnchanged
   */
  public modalUnchanged() {
    let elements = {
      tab: this.DialogEditor.getDialogTabs()[
        this.DialogEditor.activeTab],
      box: this.DialogEditor.getDialogTabs()[
        this.DialogEditor.activeTab].dialog_groups[
          this.elementInfo.boxId],
      field: this.DialogEditor.getDialogTabs()[
        this.DialogEditor.activeTab].dialog_groups[
          this.elementInfo.boxId].dialog_fields[
            this.elementInfo.fieldId]
    };
    return this.elementInfo.type in elements &&
      _.isMatch(elements[this.elementInfo.type], this.modalData);
  }

  /**
   * Store modified data back to the service.
   * @memberof ModalController
   * @function saveDialogFieldDetails
   */
  public saveDialogFieldDetails() {
    switch (this.elementInfo.type) {
      case 'tab':
        _.extend(
          this.DialogEditor.getDialogTabs()[
            this.DialogEditor.activeTab],
          { label: this.modalData.label,
            description: this.modalData.description }
        );
        break;
      case 'box':
        _.extend(
          this.DialogEditor.getDialogTabs()[
            this.DialogEditor.activeTab].dialog_groups[
              this.elementInfo.boxId],
          { label: this.modalData.label,
            description: this.modalData.description }
        );
        break;
      case 'field':
        this.DialogEditor.getDialogTabs()[
          this.DialogEditor.activeTab].dialog_groups[
            this.elementInfo.boxId].dialog_fields[
              this.elementInfo.fieldId] = this.modalData;
        break;
      default:
        break;
    }
  }

  /**
   * Delete dialog field selected in modal.
   * @memberof ModalController
   * @function deleteField
   */
  public deleteField() {
    _.remove(
      this.DialogEditor.getDialogTabs()[
        this.DialogEditor.activeTab
      ].dialog_groups[
        this.elementInfo.boxId
      ].dialog_fields,
      (field: any) => field.position === this.elementInfo.fieldId
    );
  }

  /**
   * Add entry for radio button / dropdown select.
   * @memberof ModalFieldController
   * @function addEntry
   */
  public addEntry() {
    this.modalData.values.push(['', '']);
  }

  /**
   * Remove entry for radio button / dropdown select
   * @memberof ModalFieldController
   * @function removeEntry
   * @param entry to remove from array
   */
  public removeEntry(entry: any) {
    _.pull(this.modalData.values, entry);
  }

  /**
   * Finds entries for the selected category.
   * @memberof ModalController
   * @function currentCategoryEntries
   */
  public currentCategoryEntries() {
    if (ng.isDefined(this.categories)) {
      return _.find(
        this.categories.resources,
        'id',
        this.modalData.options.category_id
      );
    }
  }

  /**
   * Receives specification of which modal should be created and it's
   * parameters, sets default tab, loads the data of the element edited in modal
   * and displays the modal.
   * @memberof ModalController
   * @function showModal
   */
  public showModal(options: any) {
    options.controller = ['parent', function(parent) { this.parent = parent; }];
    options.resolve = {
      parent: () => this
    };
    options.controllerAs = 'modalCtrl';
    options.template = ModalController.buildTemplate(options.component);
    this.modalTab = 'element_information';
    this.loadModalData(this.elementInfo);
    this.uibModalInstance = this.$uibModal.open(options);
    return this.uibModalInstance.result.catch(() => undefined);
  }

  /**
   * Building of component template.
   * New component automatically has access to any of these bindings
   * and if a new one is needed, it should be added here to be available.
   * @memberof ModalController
   * @function buildTemplate
   */
  private static buildTemplate(component: string) {
    return `<${component}
      modal-data="modalCtrl.parent.modalData"
      element-info="modalCtrl.parent.elementInfo"
      categories="modalCtrl.parent.categories"
      add-entry="modalCtrl.parent.addEntry"
      remove-entry="modalCtrl.parent.removeEntry"
      current-category-entries="modalCtrl.parent.currentCategoryEntries"
      resolve-categories="modalCtrl.parent.resolveCategories"
      modal-tab-is-set="modalCtrl.parent.modalTabIsSet"
      modal-tab-set="modalCtrl.parent.modalTabSet"
      modal-tab="modalCtrl.parent.modalTab"
      save-modal="modalCtrl.parent.saveDialogFieldDetails"
      uib-modal-instance="modalCtrl.parent.uibModalInstance"
      lazy-load="modalCtrl.parent.lazyLoad"
      show-fully-qualified-name="modalCtrl.parent.showFullyQualifiedName"
      tree-selector-data="modalCtrl.parent.treeSelectorData"
      tree-selector-toggle="modalCtrl.parent.treeSelectorToggle"
      tree-selector-show="modalCtrl.parent.treeSelectorShow"
      tree-selector-include-domain="modalCtrl.parent.treeSelectorIncludeDomain"
      on-select="modalCtrl.parent.onSelect"
      ></${component}>`;
  }
}

/**
 * @memberof miqStaticAssets
 * @ngdoc component
 * @name dialogEditorModal
 * @description
 *    Component implementing behaviour for the boxes inside of
 *    the dialogs tabs.
 * @example
 * <dialog-editor-modal>
 * </dialog-editor-modal>
 */
export default class Modal {
  public template = '';
  public transclude = true;
  public controller: any = ModalController;
  public bindings: any = {
    lazyLoad: '<',
    showFullyQualifiedName: '<',
    onSelect: '<',
    treeSelectorData: '<',
    treeSelectorToggle: '<',
    treeSelectorShow: '<',
    treeSelectorIncludeDomain: '<',
    modalOptions: '<',
    visible: '<',
    elementInfo: '<'
  };
}

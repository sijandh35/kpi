import React from 'react';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import Reflux from 'reflux';
import TagsInput from 'react-tagsinput';
import Select from 'react-select';
import TextBox from 'js/components/textBox';
import Checkbox from 'js/components/checkbox';
import {bem} from 'js/bem';
import TextareaAutosize from 'react-autosize-textarea';
import {stores} from 'js/stores';
import {actions} from 'js/actions';
import {hashHistory} from 'react-router';
import {
  t,
  notify
} from 'js/utils';
import {cleanupTags} from 'js/assetUtils';
import {
  renderLoading,
  renderBackButton,
  isLibraryAssetPublicReady
} from './modalHelpers';
import {ASSET_TYPES} from 'js/constants';

export class LibraryCollectionForm extends React.Component {
  constructor(props) {
    super(props);
    this.unlisteners = [];
    this.state = {
      isSessionLoaded: !!stores.session.currentAccount,
      data: {
        name: '',
        organization: '',
        country: null,
        sector: null,
        tags: [],
        description: '',
        isPublic: false
      },
      errors: {},
      isPending: false
    };
    autoBind(this);
  }

  componentDidMount() {
    this.listenTo(stores.session, () => {
      this.setState({isSessionLoaded: true});
    });
    this.unlisteners.push(
      actions.resources.createResource.completed.listen(this.onCreateResourceCompleted.bind(this)),
      actions.resources.createResource.failed.listen(this.onCreateResourceFailed.bind(this))
    );
  }

  componentWillUnmount() {
    this.unlisteners.forEach((clb) => {clb();});
  }

  onCreateResourceCompleted(response) {
    this.setState({isPending: false});
    notify(t('Collection ##name## created').replace('##name##', response.name));
    this.goToCollectionLandingPage(response.uid);
  }

  onCreateResourceFailed() {
    this.setState({isPending: false});
  }

  createCollection() {
    this.setState({isPending: true});

    actions.resources.createResource({
      name: this.state.data.name,
      asset_type: ASSET_TYPES.collection.id,
      settings: JSON.stringify({
        organization: this.state.data.organization,
        country: this.state.data.country,
        sector: this.state.data.sector,
        tags: this.state.data.tags,
        description: this.state.data.description
      })
    });
  }

  goToCollectionLandingPage(uid) {
    stores.pageState.hideModal();
    hashHistory.push(`/library/collection/${uid}`);
  }

  onPropertyChange(property, newValue) {
    const data = this.state.data;
    data[property] = newValue;
    this.setState({data: data});
    this.validate();
  }

  onNameChange(newValue) {this.onPropertyChange('name', newValue);}
  onOrganizationChange(newValue) {this.onPropertyChange('organization', newValue);}
  onCountryChange(newValue) {this.onPropertyChange('country', newValue);}
  onSectorChange(newValue) {this.onPropertyChange('sector', newValue);}
  onTagsChange(newValue) {this.onPropertyChange('tags', cleanupTags(newValue));}
  onDescriptionChange(evt) {this.onPropertyChange('description', evt.target.value);}
  onIsPublicChange(newValue) {this.onPropertyChange('isPublic', newValue);}

  validate() {
    let errors = {};
    if (this.state.data.isPublic) {
      const validateResult = isLibraryAssetPublicReady(
        this.state.data.name,
        this.state.data.organization,
        this.state.data.sector
      );
      if (validateResult !== true) {
        errors = validateResult;
      }
    }
    this.setState({errors: errors});
  }

  isSubmitEnabled() {
    return (
      !this.state.isPending &&
      Object.keys(this.state.errors).length === 0
    );
  }

  render() {
    if (!this.state.isSessionLoaded) {
      return renderLoading();
    }

    const SECTORS = stores.session.environment.available_sectors;
    const COUNTRIES = stores.session.environment.available_countries;

    const sectorWrapperClassNames = ['kobo-select__wrapper'];
    if (this.state.errors.sector) {
      sectorWrapperClassNames.push('kobo-select__wrapper--error');
    }

    return (
      <bem.FormModal__form className='project-settings'>
        <bem.FormModal__item m='wrapper' disabled={this.state.isPending}>
          <bem.FormModal__item>
            <TextBox
              value={this.state.data.name}
              onChange={this.onNameChange}
              label={t('Name') + '*'}
              errors={this.state.errors.name}
            />
          </bem.FormModal__item>

          <bem.FormModal__item>
            <TextBox
              value={this.state.data.organization}
              onChange={this.onOrganizationChange}
              label={t('Organization') + '*'}
              errors={this.state.errors.organization}
            />
          </bem.FormModal__item>

          <bem.FormModal__item>
            <label htmlFor='country'>
              {t('Country')}
            </label>

            <Select
              id='country'
              value={this.state.data.country}
              onChange={this.onCountryChange}
              options={COUNTRIES}
              className='kobo-select'
              classNamePrefix='kobo-select'
              menuPlacement='auto'
              isClearable
            />
          </bem.FormModal__item>

          <bem.FormModal__item className={sectorWrapperClassNames.join(' ')}>
            <label htmlFor='sector'>
              {t('Primary Sector') + '*'}
            </label>

            <Select
              id='sector'
              value={this.state.data.sector}
              onChange={this.onSectorChange}
              options={SECTORS}
              className='kobo-select'
              classNamePrefix='kobo-select'
              menuPlacement='auto'
              isClearable
            />

            {this.state.errors.sector &&
              <div className='kobo-select-error'>{this.state.errors.sector}</div>
            }
          </bem.FormModal__item>

          <bem.FormModal__item>
            <TagsInput
              value={this.state.data.tags}
              onChange={this.onTagsChange}
              inputProps={{placeholder: t('Tags')}}
            />
          </bem.FormModal__item>

          <bem.FormModal__item>
            <TextareaAutosize
              onChange={this.onDescriptionChange}
              value={this.state.data.description}
              placeholder={t('Enter short description here')}
            />
          </bem.FormModal__item>

          <bem.FormModal__item>
            <Checkbox
              checked={this.state.data.isPublic}
              onChange={this.onIsPublicChange}
              label={t('Make Public') + ' ' + t('*required to be made public')}
            />
          </bem.FormModal__item>
        </bem.FormModal__item>

        <bem.Modal__footer>
          {renderBackButton(this.state.isPending)}

          <bem.Modal__footerButton
            m='primary'
            type='submit'
            onClick={this.createCollection}
            disabled={!this.isSubmitEnabled()}
            className='mdl-js-button'
          >
            {this.state.isPending ? t('Creating…') : t('Create')}
          </bem.Modal__footerButton>
        </bem.Modal__footer>
      </bem.FormModal__form>
    );
  }
}

reactMixin(LibraryCollectionForm.prototype, Reflux.ListenerMixin);

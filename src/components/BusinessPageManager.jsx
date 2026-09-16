import React, {useEffect, useMemo, useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BusinessPageContentSection from './BusinessPageContentSection';
import BusinessPageCompleteness from './BusinessPageCompleteness';
import {
  businessPageFormValues,
  saveBusinessPage
} from '../services/businessPageService';
import {listBookingTypes} from '../services/bookingTypeService';
import {createBrandedQr} from '../utils/brandedQr';
import {getPublicBusinessPageUrl} from '../utils/publicBusinessLinks';
import './BusinessPageManager.css';
import './BusinessPageContentSection.css';
import './BusinessPageCompleteness.css';

const {
  FiBriefcase,
  FiCheck,
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShare2,
  FiUpload
} = FiIcons;

function BusinessPageManager({initialData}) {
  const {page, registrationCategory, user} = initialData;
  const [values, setValues] = useState(() =>
    businessPageFormValues(page, registrationCategory, user)
  );
  const [savedPage, setSavedPage] = useState(page);
  const [bookingTypeCount, setBookingTypeCount] = useState(0);
  const [qrImage, setQrImage] = useState('');
  const [qrDownloadUrl, setQrDownloadUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingSection, setSavingSection] = useState('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setValues(businessPageFormValues(page, registrationCategory, user));
    setSavedPage(page);
  }, [page, registrationCategory, user]);

  useEffect(() => {
    listBookingTypes()
      .then((items) => setBookingTypeCount(items.length))
      .catch(() => setBookingTypeCount(0));
  }, []);

  const publicLink = useMemo(
    () =>
      getPublicBusinessPageUrl(
        values.businessSlug ||
          values.businessName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') ||
          'your-business'
      ),
    [values.businessName, values.businessSlug]
  );

  const logoPreview = useMemo(
    () => (values.logoFile ? URL.createObjectURL(values.logoFile) : values.logoUrl),
    [values.logoFile, values.logoUrl]
  );

  useEffect(
    () => () => {
      if (values.logoFile && logoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    },
    [values.logoFile, logoPreview]
  );

  useEffect(() => {
    if (!savedPage?.business_slug) {
      setQrImage('');
      setQrDownloadUrl('');
      return;
    }

    const link = getPublicBusinessPageUrl(savedPage.business_slug);

    createBrandedQr(link, 900)
      .then(({dataUrl, fallbackUrl}) => {
        setQrImage(dataUrl || fallbackUrl);
        setQrDownloadUrl(dataUrl || fallbackUrl);
      })
      .catch(() => {
        const fallbackUrl =
          `https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=24&ecc=H&color=064c5d&bgcolor=ffffff&data=${encodeURIComponent(link)}`;

        setQrImage(fallbackUrl);
        setQrDownloadUrl(fallbackUrl);
      });
  }, [savedPage?.business_slug]);

  const update = (key, value) =>
    setValues((current) => ({...current, [key]: value}));

  const selectLogo = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      update('logoFile', file);
      update('logoUrl', '');
    }
  };

  const selectImages = (event) => {
    update(
      'imageFiles',
      Array.from(event.target.files || []).slice(0, 5)
    );
  };

  const selectClientLogos = (event) => {
    update(
      'clientLogoFiles',
      Array.from(event.target.files || []).slice(0, 8)
    );
  };

  const persistPage = async (sectionName = '') => {
    if (sectionName) {
      setSavingSection(sectionName);
    } else {
      setSaving(true);
    }

    setNotice('');
    setError('');

    try {
      const saved = await saveBusinessPage(values, savedPage || page);

      setSavedPage(saved);
      setValues((current) => ({
        ...current,
        businessSlug: saved.business_slug,
        logoUrl: saved.logo_url,
        logoFile: null,
        businessImages: saved.business_images || [],
        clientLogos: saved.client_logos || [],
        clientLogoFiles: [],
        imageFiles: []
      }));
      setNotice(
        sectionName
          ? `${sectionName} saved successfully.`
          : 'Business page saved and published. Your public link is ready.'
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      if (sectionName) {
        setSavingSection('');
      } else {
        setSaving(false);
      }
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    await persistPage();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Unable to copy the link. Please copy it manually.');
    }
  };

  const shareLink = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: savedPage?.business_name || values.businessName || 'Business page',
        text: `Discover ${savedPage?.business_name || values.businessName || 'this business'}.`,
        url: publicLink
      });
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {}
  };

  const downloadQr = () => {
    if (!qrDownloadUrl) return;

    const link = document.createElement('a');
    link.href = qrDownloadUrl;
    link.download = `${savedPage?.business_slug || 'business'}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="business-page-manager">
      <header className="business-page-manager__intro">
        <div>
          <span className="dashboard-eyebrow">Customer-facing presence</span>
          <h2>My Business Page</h2>
          <p>
            Create a premium public profile with your services, products,
            brand assets and a direct booking CTA.
          </p>
        </div>
        <span className="business-page-manager__status">
          <span /> Published
        </span>
      </header>

      <BusinessPageCompleteness
        page={savedPage || values}
        bookingTypeCount={bookingTypeCount}
      />

      {notice && <p className="business-page-notice">{notice}</p>}
      {error && (
        <p className="business-page-notice business-page-notice--error">
          {error}
        </p>
      )}

      <form className="business-page-form" onSubmit={submit}>
        <PageSection
          icon={FiBriefcase}
          title="Business identity"
          copy="Your registration category is retained and shown as a reference."
          onSave={() => persistPage('Business identity')}
          saving={savingSection === 'Business identity'}
        >
          <div className="business-page-grid">
            <Field
              label="Business name"
              value={values.businessName}
              onChange={(value) => update('businessName', value)}
              required
            />
            <Field
              label="Business URL slug"
              value={values.businessSlug}
              onChange={(value) => update('businessSlug', value)}
              placeholder="your-business"
            />
            <label className="business-page-field">
              <span>Business category</span>
              <span className="business-page-readonly">
                <SafeIcon icon={FiBriefcase} />
                {values.businessCategory || 'Not available'}
              </span>
              <small>Category used while registering.</small>
            </label>
            <Field
              label="Years of experience"
              type="number"
              value={values.yearsOfExperience}
              onChange={(value) => update('yearsOfExperience', value)}
              min="0"
            />
          </div>
          <Field
            label="Business expertise or domain"
            value={values.businessExpertise}
            onChange={(value) => update('businessExpertise', value)}
            placeholder="What your business is known for"
          />
        </PageSection>

        <PageSection
          icon={FiMapPin}
          title="Business location"
          copy="Add the address and map details customers can use to find your office."
          onSave={() => persistPage('Business location')}
          saving={savingSection === 'Business location'}
        >
          <div className="business-page-grid">
            <Field
              label="Business address"
              value={values.businessAddress}
              onChange={(value) => update('businessAddress', value)}
              placeholder="Full office or business address"
            />
            <Field
              label="Pincode"
              value={values.pincode}
              onChange={(value) =>
                update('pincode', value.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="Postal code"
              inputMode="numeric"
            />
            <Field
              label="Website address (optional)"
              type="url"
              value={values.websiteAddress}
              onChange={(value) => update('websiteAddress', value)}
              placeholder="https://yourbusiness.com"
            />
            <Field
              label="Office location map link"
              type="url"
              value={values.officeLocationMapLink}
              onChange={(value) => update('officeLocationMapLink', value)}
              placeholder="Google Maps link"
            />
          </div>
        </PageSection>

        <PageSection
          icon={FiImage}
          title="Brand and visual story"
          copy="Add a logo and up to five business or product images."
          onSave={() => persistPage('Brand and visual story')}
          saving={savingSection === 'Brand and visual story'}
        >
          <div className="business-page-upload-grid">
            <label className="business-page-upload">
              <span>
                <SafeIcon icon={FiUpload} /> Business logo
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selectLogo}
              />
              {logoPreview && (
                <div className="business-page-logo-preview">
                  <img src={logoPreview} alt="Business logo preview" />
                  {values.logoFile && (
                    <small>
                      {values.logoFile.name} · Ready to upload when saved
                    </small>
                  )}
                </div>
              )}
            </label>

            <label className="business-page-upload business-page-upload--wide">
              <span>
                <SafeIcon icon={FiUpload} /> Business or product images
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={selectImages}
              />
              <small>Select up to 5 images.</small>
              <div className="business-page-image-previews">
                {(values.imageFiles.length
                  ? values.imageFiles.map((file) => URL.createObjectURL(file))
                  : values.businessImages
                )
                  .slice(0, 5)
                  .map((src) => (
                    <img
                      src={src}
                      alt="Business or product preview"
                      key={src}
                    />
                  ))}
              </div>
            </label>
          </div>
        </PageSection>

        <PageSection
          icon={FiMapPin}
          title="What you offer"
          copy="Help visitors understand your expertise, services, products and ideal customers."
          onSave={() => persistPage('What you offer')}
          saving={savingSection === 'What you offer'}
        >
          <div className="business-page-grid">
            <TextArea
              label="Expertise in"
              value={values.servicesOffered}
              onChange={(value) => update('servicesOffered', value)}
              placeholder="What your business is an expert in"
            />
            <TextArea
              label="Products and services"
              value={values.products}
              onChange={(value) => update('products', value)}
              placeholder="List your products and services"
            />
            <TextArea
              label="Cater to"
              value={values.caterTo}
              onChange={(value) => update('caterTo', value)}
              placeholder="Who your business caters to"
            />
          </div>
        </PageSection>

        <BusinessPageContentSection
          aboutUs={values.aboutUs}
          testimonials={values.clientTestimonials}
          clientLogos={values.clientLogos}
          onAboutUsChange={(value) => update('aboutUs', value)}
          onTestimonialsChange={(value) => update('clientTestimonials', value)}
          onClientLogosChange={(value) => update('clientLogos', value)}
          onLogoUpload={selectClientLogos}
          onSave={() => persistPage('About and trust content')}
          saving={savingSection === 'About and trust content'}
        />

        <PageSection
          icon={FiPhone}
          title="Primary contact"
          copy="These details appear on the public page."
          onSave={() => persistPage('Primary contact')}
          saving={savingSection === 'Primary contact'}
        >
          <div className="business-page-grid">
            <Field
              label="Primary business contact number"
              value={values.primaryContactNumber}
              onChange={(value) =>
                update(
                  'primaryContactNumber',
                  value.replace(/\D/g, '').slice(0, 10)
                )
              }
              inputMode="numeric"
              maxLength="10"
            />
            <Field
              label="Business email ID"
              type="email"
              value={values.emailId}
              onChange={(value) => update('emailId', value)}
            />
          </div>
        </PageSection>

        <PageSection
          icon={FiGlobe}
          title="Social media links"
          copy="These links are shown as clickable social buttons on your public page."
          onSave={() => persistPage('Social media links')}
          saving={savingSection === 'Social media links'}
        >
          <div className="business-page-social-grid">
            <Field
              label="Facebook"
              value={values.socialFacebook}
              onChange={(value) => update('socialFacebook', value)}
              placeholder="https://facebook.com/your-page"
            />
            <Field
              label="Instagram"
              value={values.socialInstagram}
              onChange={(value) => update('socialInstagram', value)}
              placeholder="https://instagram.com/your-page"
            />
            <Field
              label="X"
              value={values.socialX}
              onChange={(value) => update('socialX', value)}
              placeholder="https://x.com/your-page"
            />
            <Field
              label="LinkedIn"
              value={values.socialLinkedin}
              onChange={(value) => update('socialLinkedin', value)}
              placeholder="https://linkedin.com/company/your-page"
            />
          </div>
        </PageSection>

        <footer className="business-page-form__footer">
          <span className="business-page-publish">
            <SafeIcon icon={FiCheck} />
            <span>Use each section button to save independently.</span>
          </span>
          <button className="dashboard-primary" disabled={saving}>
            <SafeIcon icon={saving ? FiSave : FiCheck} />
            {saving ? 'Saving…' : 'Save all changes'}
          </button>
        </footer>
      </form>

      <div className="business-page-share-card">
        <div className="business-page-share-card__copy">
          <span className="business-page-share-card__eyebrow">
            Public business page
          </span>
          <strong>{publicLink}</strong>
          <small>
            This link opens the published business page directly for clients.
          </small>
          <div className="business-page-share-actions">
            <button
              type="button"
              className="business-page-share-button"
              onClick={copyLink}
            >
              <SafeIcon icon={copied ? FiCheck : FiCopy} />
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <button
              type="button"
              className="business-page-share-button"
              onClick={shareLink}
            >
              <SafeIcon icon={shared ? FiCheck : FiShare2} />
              {shared ? 'Shared' : 'Share link'}
            </button>
            <a
              className="business-page-share-button"
              href={publicLink}
              target="_blank"
              rel="noreferrer"
            >
              <SafeIcon icon={FiExternalLink} />
              Open page
            </a>
          </div>
        </div>

        <div className="business-page-share-card__qr">
          {qrImage ? (
            <img
              src={qrImage}
              alt={`QR code for ${savedPage?.business_name || values.businessName}`}
            />
          ) : (
            <div className="business-page-qr-placeholder">
              <SafeIcon icon={FiImage} />
              <span>QR generated after saving</span>
            </div>
          )}
          <button
            type="button"
            className="business-page-qr-download"
            onClick={downloadQr}
            disabled={!qrDownloadUrl}
          >
            <SafeIcon icon={FiDownload} />
            Download QR
          </button>
        </div>
      </div>
    </section>
  );
}

function PageSection({icon, title, copy, children, onSave, saving}) {
  return (
    <section className="business-page-section">
      <header>
        <span>
          <SafeIcon icon={icon} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{copy}</p>
        </div>
      </header>
      {children}
      <div className="business-page-section__actions">
        <button
          type="button"
          className="business-page-section-save"
          onClick={onSave}
          disabled={saving}
        >
          <SafeIcon icon={saving ? FiSave : FiCheck} />
          {saving ? 'Saving section…' : 'Save this section'}
        </button>
      </div>
    </section>
  );
}

function Field({label, value, onChange, type = 'text', placeholder, ...props}) {
  return (
    <label className="business-page-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...props}
      />
    </label>
  );
}

function TextArea({label, value, onChange, placeholder}) {
  return (
    <label className="business-page-field">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows="6"
      />
    </label>
  );
}

export default BusinessPageManager;
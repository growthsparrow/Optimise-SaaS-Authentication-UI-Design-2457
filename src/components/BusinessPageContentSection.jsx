import React, {useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {FiPlus, FiTrash2, FiUpload} = FiIcons;

const emptyTestimonial = {
  name: '',
  role: '',
  quote: ''
};

function BusinessPageContentSection({
  aboutUs,
  testimonials,
  clientLogos,
  onAboutUsChange,
  onTestimonialsChange,
  onClientLogosChange,
  onLogoUpload
}) {
  const [testimonial, setTestimonial] = useState(emptyTestimonial);

  const addTestimonial = () => {
    if (!testimonial.name.trim() || !testimonial.quote.trim()) {
      return;
    }

    onTestimonialsChange([
      ...testimonials,
      {
        name: testimonial.name.trim(),
        role: testimonial.role.trim(),
        quote: testimonial.quote.trim()
      }
    ]);
    setTestimonial(emptyTestimonial);
  };

  const removeTestimonial = (index) => {
    onTestimonialsChange(
      testimonials.filter((_, testimonialIndex) => testimonialIndex !== index)
    );
  };

  return (
    <section className="business-page-section business-page-content-section">
      <header>
        <span>
          <SafeIcon icon={FiPlus} />
        </span>
        <div>
          <h3>About us, testimonials and client logos</h3>
          <p>
            Add the trust-building content visitors should see on your public
            business page.
          </p>
        </div>
      </header>

      <label className="business-page-field">
        <span>About us</span>
        <textarea
          value={aboutUs}
          onChange={(event) => onAboutUsChange(event.target.value)}
          placeholder="Tell visitors about your story, approach and experience."
          rows="7"
        />
      </label>

      <div className="business-page-content-block">
        <div className="business-page-content-block__heading">
          <div>
            <strong>Client testimonials</strong>
            <small>Add quotes from clients or customers.</small>
          </div>
          <SafeIcon icon={FiPlus} />
        </div>

        <div className="business-page-testimonial-editor">
          <input
            value={testimonial.name}
            onChange={(event) =>
              setTestimonial((current) => ({
                ...current,
                name: event.target.value
              }))
            }
            placeholder="Client name"
          />
          <input
            value={testimonial.role}
            onChange={(event) =>
              setTestimonial((current) => ({
                ...current,
                role: event.target.value
              }))
            }
            placeholder="Role or company (optional)"
          />
          <textarea
            value={testimonial.quote}
            onChange={(event) =>
              setTestimonial((current) => ({
                ...current,
                quote: event.target.value
              }))
            }
            placeholder="What did the client say?"
            rows="3"
          />
          <button
            type="button"
            className="business-page-share-button"
            onClick={addTestimonial}
            disabled={!testimonial.name.trim() || !testimonial.quote.trim()}
          >
            <SafeIcon icon={FiPlus} />
            Add testimonial
          </button>
        </div>

        {testimonials.length > 0 && (
          <div className="business-page-testimonial-list">
            {testimonials.map((item, index) => (
              <article
                className="business-page-testimonial-item"
                key={`${item.name}-${index}`}
              >
                <div>
                  <strong>{item.name}</strong>
                  {item.role && <small>{item.role}</small>}
                  <p>{item.quote}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTestimonial(index)}
                  aria-label={`Remove testimonial from ${item.name}`}
                >
                  <SafeIcon icon={FiTrash2} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="business-page-content-block">
        <div className="business-page-content-block__heading">
          <div>
            <strong>Client logos</strong>
            <small>Upload logos for clients, partners or trusted brands.</small>
          </div>
          <label className="business-page-logo-upload">
            <SafeIcon icon={FiUpload} />
            Add logos
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={onLogoUpload}
            />
          </label>
        </div>

        {clientLogos.length > 0 && (
          <div className="business-page-logo-list">
            {clientLogos.map((logo, index) => (
              <div className="business-page-logo-item" key={`${logo}-${index}`}>
                <img src={logo} alt={`Client logo ${index + 1}`} />
                <button
                  type="button"
                  onClick={() =>
                    onClientLogosChange(
                      clientLogos.filter((_, logoIndex) => logoIndex !== index)
                    )
                  }
                  aria-label={`Remove client logo ${index + 1}`}
                >
                  <SafeIcon icon={FiTrash2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BusinessPageContentSection;
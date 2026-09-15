import React,{useEffect,useMemo,useState} from 'react';
import {useParams} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {getPublicBusinessPage,splitLines} from '../services/businessPageService';
import {createBrandedQr} from '../utils/brandedQr';
import {
  getPublicBookingUrl,
  getPublicBusinessPageUrl
} from '../utils/publicBusinessLinks';
import './PublicBusinessPage.css';

const {
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiShare2,
  FiTwitter
}=FiIcons;

const defaultTheme={
  accent:'#087f8d',
  deep:'#063e50',
  soft:'#e8f8f7',
  mist:'#f3f8fa',
  ink:'#164f5b'
};

function PublicBusinessPage() {
  const {slug}=useParams();
  const [page,setPage]=useState(null);
  const [qr,setQr]=useState('');
  const [notice,setNotice]=useState('');
  const [activeImage,setActiveImage]=useState(0);
  const [loading,setLoading]=useState(true);
  const [theme,setTheme]=useState(defaultTheme);
  const [touchStart,setTouchStart]=useState(null);

  const pageLink=getPublicBusinessPageUrl(slug);
  const bookingLink=getPublicBookingUrl(slug);

  const services=useMemo(
    ()=> splitLines(page?.services_offered),
    [page]
  );

  const products=useMemo(
    ()=> splitLines(page?.products),
    [page]
  );

  const images=useMemo(
    ()=> Array.isArray(page?.business_images)
      ? page.business_images.filter(Boolean).slice(0,5)
      : [],
    [page]
  );

  useEffect(()=> {
    let active=true;

    setLoading(true);
    setPage(null);
    setNotice('');
    setActiveImage(0);

    getPublicBusinessPage(slug)
      .then((businessPage)=> {
        if (active) setPage(businessPage);
      })
      .catch((error)=> {
        if (active) setNotice(error.message);
      })
      .finally(()=> {
        if (active) setLoading(false);
      });

    return ()=> {
      active=false;
    };
  },[slug]);

  useEffect(()=> {
    if (!page) return;

    document.title=`${page.business_name} | Optimise`;

    const description=page.business_expertise ||
      `Discover ${page.business_name} and book an appointment.`;

    updateMeta('og:title',page.business_name,'property');
    updateMeta('og:description',description,'property');
    updateMeta('og:url',pageLink,'property');
    updateMeta('twitter:title',page.business_name,'name');
    updateMeta('twitter:description',description,'name');

    if (page.logo_url) {
      extractLogoTheme(page.logo_url)
        .then((logoTheme)=> setTheme(logoTheme))
        .catch(()=> setTheme(defaultTheme));
    } else {
      setTheme(defaultTheme);
    }
  },[page,pageLink]);

  useEffect(()=> {
    createBrandedQr(pageLink,700)
      .then(({dataUrl,fallbackUrl})=> setQr(dataUrl || fallbackUrl))
      .catch(()=> setQr(''));
  },[pageLink]);

  const share=async ()=> {
    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(pageLink);
        setNotice('Business page link copied.');
      } catch {
        setNotice('Copy the public page link from your browser address bar.');
      }
      return;
    }

    try {
      await navigator.share({
        title:page?.business_name || 'Business page',
        text:`Discover ${page?.business_name || 'this business'} and book an appointment.`,
        url:pageLink
      });
    } catch {
      // The visitor closed the native share sheet.
    }
  };

  const previousImage=()=> {
    setActiveImage(
      (current)=> (current - 1 + images.length) % images.length
    );
  };

  const nextImage=()=> {
    setActiveImage((current)=> (current + 1) % images.length);
  };

  const handleTouchStart=(event)=> {
    setTouchStart(event.changedTouches[0].clientX);
  };

  const handleTouchEnd=(event)=> {
    if (touchStart === null || images.length < 2) return;

    const distance=event.changedTouches[0].clientX - touchStart;

    if (Math.abs(distance) > 45) {
      if (distance < 0) nextImage();
      else previousImage();
    }

    setTouchStart(null);
  };

  if (loading) {
    return (
      <main className="public-business-state">
        <div className="public-business-state__loader" />
        <strong>Preparing the business experience</strong>
        <p>Fetching the latest published information.</p>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="public-business-state public-business-state--error">
        <div>
          <strong>Business page unavailable</strong>
          <p>{notice || 'This public business page could not be found.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="public-business-page"
      style={{
        '--business-accent':theme.accent,
        '--business-deep':theme.deep,
        '--business-soft':theme.soft,
        '--business-mist':theme.mist,
        '--business-ink':theme.ink
      }}
    >
      <section className="public-business-hero">
        <div className="public-business-hero__orb public-business-hero__orb--one" />
        <div className="public-business-hero__orb public-business-hero__orb--two" />

        <div className="public-business-hero__topline">
          <span>Business profile</span>
          <button type="button" onClick={share} aria-label="Share business page">
            <SafeIcon icon={FiShare2} />
            Share
          </button>
        </div>

        <div className="public-business-hero__body">
          {page.logo_url && (
            <img
              className="public-business-logo"
              src={page.logo_url}
              alt={`${page.business_name} logo`}
            />
          )}

          <span className="public-business-category">
            {page.business_category || 'Professional services'}
          </span>

          <h1>{page.business_name || 'Your business'}</h1>

          <p>
            {page.business_expertise ||
              'A trusted business ready to help you.'}
          </p>

          <div className="public-business-hero__actions">
            <a className="public-business-cta" href={bookingLink}>
              <SafeIcon icon={FiCalendar} />
              Book an appointment
              <SafeIcon icon={FiArrowRight} />
            </a>

            {page.primary_contact_number && (
              <a
                className="public-business-call"
                href={`tel:${page.primary_contact_number}`}
              >
                <SafeIcon icon={FiPhone} />
                Call business
              </a>
            )}
          </div>
        </div>

        <div className="public-business-hero__footer">
          <span>Trusted service</span>
          <span>Direct booking</span>
          <span>Personal support</span>
        </div>
      </section>

      {images.length > 0 && (
        <section
          className="public-business-gallery-section"
          aria-label="Business images"
        >
          <div className="public-business-section-heading">
            <div>
              <span className="public-business-kicker">A closer look</span>
              <h2>Inside the business</h2>
            </div>

            <span className="public-business-gallery-count">
              {String(activeImage + 1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}
            </span>
          </div>

          <div
            className="public-business-slider"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="public-business-gallery-track"
              style={{'--active-slide':activeImage}}
            >
              {images.map((image,index)=> (
                <div
                  className="public-business-gallery-slide"
                  key={`${image}-${index}`}
                >
                  <img
                    src={image}
                    alt={`${page.business_name} business ${index + 1}`}
                    draggable="false"
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <div className="public-business-slider-controls">
                <button
                  type="button"
                  onClick={previousImage}
                  aria-label="Previous business image"
                >
                  <SafeIcon icon={FiChevronLeft} />
                </button>

                <div className="public-business-slider-dots">
                  {images.map((image,index)=> (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      className={index===activeImage ? 'is-active' : ''}
                      onClick={()=> setActiveImage(index)}
                      aria-label={`Show business image ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next business image"
                >
                  <SafeIcon icon={FiChevronRight} />
                </button>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <p className="public-business-gallery-hint">
              Swipe to explore
            </p>
          )}
        </section>
      )}

      <section className="public-business-content">
        <InfoBlock title="About the business" icon={FiBriefcase}>
          <p>
            {page.business_expertise ||
              'Discover our expertise and services.'}
          </p>
          <strong>
            {page.years_of_experience || 0} years of experience
          </strong>
        </InfoBlock>

        <InfoBlock title="Services offered" icon={FiCheck}>
          <List items={services} empty="Services will be updated soon." />
        </InfoBlock>

        <InfoBlock title="Products" icon={FiBriefcase}>
          <List items={products} empty="Products will be updated soon." />
        </InfoBlock>

        <InfoBlock title="Contact" icon={FiPhone}>
          <div className="public-business-contact">
            {page.primary_contact_number && (
              <a href={`tel:${page.primary_contact_number}`}>
                <SafeIcon icon={FiPhone} />
                {page.primary_contact_number}
              </a>
            )}

            {page.email_id && (
              <a href={`mailto:${page.email_id}`}>
                <SafeIcon icon={FiMail} />
                {page.email_id}
              </a>
            )}
          </div>
        </InfoBlock>
      </section>

      <section className="public-business-footer-card">
        <div>
          <span className="public-business-kicker">Ready when you are</span>
          <h2>Make your next appointment simple.</h2>
          <p>Choose a convenient time and get started in a few moments.</p>
          <SocialLinks page={page} />
        </div>

        <div className="public-business-footer-card__action">
          {qr && (
            <img
              className="public-business-qr"
              src={qr}
              alt={`QR code for ${page.business_name}`}
            />
          )}

          <a className="public-business-cta" href={bookingLink}>
            Book now
            <SafeIcon icon={FiArrowRight} />
          </a>
        </div>
      </section>

      <footer className="public-business-credit">
        This page is created by{' '}
        <a
          href="https://optimise.growthsparrow.com"
          target="_blank"
          rel="noreferrer"
        >
          Optimise
        </a>
        , a product from{' '}
        <a
          href="https://growthsparrow.com"
          target="_blank"
          rel="noreferrer"
        >
          Growth Sparrow
        </a>
        .
      </footer>

      {notice && <p className="public-business-toast">{notice}</p>}
    </main>
  );
}

function extractLogoTheme(url) {
  return new Promise((resolve,reject)=> {
    const image=new Image();
    image.crossOrigin='anonymous';
    image.onload=()=> {
      const canvas=document.createElement('canvas');
      const context=canvas.getContext('2d');

      canvas.width=48;
      canvas.height=48;
      context.drawImage(image,0,0,48,48);

      const pixels=context.getImageData(0,0,48,48).data;
      let red=0;
      let green=0;
      let blue=0;
      let count=0;

      for (let index=0;index<pixels.length;index+=4) {
        const alpha=pixels[index + 3];

        if (alpha < 150) continue;

        const brightness=(
          pixels[index] +
          pixels[index + 1] +
          pixels[index + 2]
        ) / 3;

        if (brightness > 245) continue;

        red+=pixels[index];
        green+=pixels[index + 1];
        blue+=pixels[index + 2];
        count+=1;
      }

      if (!count) {
        resolve(defaultTheme);
        return;
      }

      const base={
        red:Math.round(red / count),
        green:Math.round(green / count),
        blue:Math.round(blue / count)
      };

      resolve(createTheme(base));
    };

    image.onerror=reject;
    image.src=url;
  });
}

function createTheme({red,green,blue}) {
  const accent=toHex(red,green,blue);
  const deep=toHex(
    Math.round(red * .25),
    Math.round(green * .25),
    Math.round(blue * .25)
  );
  const soft=toHex(
    Math.min(255,Math.round(red + (255 - red) * .84)),
    Math.min(255,Math.round(green + (255 - green) * .84)),
    Math.min(255,Math.round(blue + (255 - blue) * .84))
  );
  const mist=toHex(
    Math.min(255,Math.round(red + (255 - red) * .94)),
    Math.min(255,Math.round(green + (255 - green) * .94)),
    Math.min(255,Math.round(blue + (255 - blue) * .94))
  );
  const ink=toHex(
    Math.round(red * .42),
    Math.round(green * .42),
    Math.round(blue * .42)
  );

  return {accent,deep,soft,mist,ink};
}

function toHex(red,green,blue) {
  return `#${[red,green,blue]
    .map((value)=> Math.max(0,Math.min(255,value))
      .toString(16)
      .padStart(2,'0'))
    .join('')}`;
}

function updateMeta(name,content,attribute) {
  const meta=document.querySelector(`meta[${attribute}="${name}"]`);

  if (meta) {
    meta.setAttribute('content',content);
  }
}

function InfoBlock({title,icon,children}) {
  return (
    <article className="public-business-info">
      <span className="public-business-info__icon">
        <SafeIcon icon={icon} />
      </span>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function List({items,empty}) {
  return items.length ? (
    <ul>
      {items.map((item)=> <li key={item}>{item}</li>)}
    </ul>
  ) : (
    <p>{empty}</p>
  );
}

function SocialLinks({page}) {
  const links=[
    [page.social_facebook,'Facebook',FiFacebook],
    [page.social_instagram,'Instagram',FiInstagram],
    [page.social_x,'X',FiTwitter],
    [page.social_linkedin,'LinkedIn',FiLinkedin]
  ];

  return (
    <div className="public-business-socials">
      {links
        .filter(([url])=> Boolean(url))
        .map(([url,label,icon])=> (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            key={label}
            aria-label={label}
            title={label}
          >
            <SafeIcon icon={icon} />
          </a>
        ))}
    </div>
  );
}

export default PublicBusinessPage;
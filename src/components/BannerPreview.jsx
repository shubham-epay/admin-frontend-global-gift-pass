import { useState } from 'react';
import Icon from './Icon';

const isUrl = (v) => /^https?:\/\/\S+$/i.test(v || '');

/**
 * Live preview of a banner as the storefront renders it: heading, text and button laid over the image.
 * Text scales with the preview width (container query units), so desktop and mobile stay proportional.
 */
export default function BannerPreview({ values }) {
  const [device, setDevice] = useState('desktop');
  const mobile = device === 'mobile';
  const image = mobile ? (values.mobileImageUrl || values.imageUrl) : values.imageUrl;
  const position = (values.textPosition || 'LEFT').toLowerCase();
  const theme = (values.textTheme || 'DARK').toLowerCase();
  const color = /^#[0-9a-f]{6}$/i.test(values.buttonColor || '') ? values.buttonColor : '#E0435A';

  return (
    <section className="panel pad banner-preview-panel">
      <div className="row-between">
        <h2>Live preview</h2>
        <div className="segmented segmented-inline" role="radiogroup" aria-label="Preview device">
          <button type="button" role="radio" aria-checked={!mobile} className={!mobile ? 'is-on' : ''} onClick={() => setDevice('desktop')}><Icon name="monitor" size={15} />Desktop</button>
          <button type="button" role="radio" aria-checked={mobile} className={mobile ? 'is-on' : ''} onClick={() => setDevice('mobile')}><Icon name="menu" size={15} />Mobile</button>
        </div>
      </div>
      <div className={`banner-stage ${mobile ? 'is-mobile' : ''}`}>
        <div className={`banner-canvas pos-${position} theme-${theme}`}>
          {isUrl(image)
            ? <img className="banner-img" src={image} alt={values.imageAlt || ''} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            : <div className="banner-img banner-img-empty"><Icon name="image" size={28} /><span>Add a {mobile && !values.imageUrl ? '' : mobile ? 'mobile ' : 'desktop '}image URL to preview</span></div>}
          <div className="banner-copy">
            <h3 className="banner-heading">{values.title || 'Your heading'}</h3>
            {(values.subtitle || !values.title) && <p className="banner-text">{values.subtitle || 'A short line of supporting text.'}</p>}
            {values.buttonText && <span className="banner-btn" style={{ background: color }}>{values.buttonText}</span>}
          </div>
        </div>
      </div>
      <p className="field-help">
        Desktop image: about 1950 × 800 px (2.4 : 1). Keep the {position === 'center' ? 'middle' : position} side of the image plain so the text stays readable.
        {mobile && !values.mobileImageUrl && ' No mobile image set — the desktop image is cropped.'}
      </p>
    </section>
  );
}

import { useEffect, useState } from 'react';
import type { ImageSelection, VisionAnswer } from '@unforked/contracts';
export function ImageExplanation({ selection, answer, demo, available, busy, onExplain, onDiscard }: { selection: ImageSelection; answer: VisionAnswer | null; demo: boolean; available: boolean; busy: boolean; onExplain(question: string): void; onDiscard(): void }) {
  const [question, setQuestion] = useState('');
  useEffect(() => setQuestion(''), [selection]);
  return <section className="image-explanation">
    <div className="section-heading"><div><h2>Your circled image</h2><p>Only this selection will be sent for explanation.</p></div><button className="text-button" type="button" onClick={onDiscard} aria-label="Discard image">Discard</button></div>
    <img className="selected-image" src={`data:${selection.image.mime};base64,${selection.image.data}`} alt="Selected GitHub area" width={selection.image.width} height={selection.image.height}/>
    <p className="quiet-note">The local AI reads this image. Small or cropped text may be unclear. Images are not added to your saved repositories.</p>
    {!available && <p className="quiet-note">Local image AI is unavailable. Ask the beta owner to start it, then use Check connection in Settings.</p>}
    <form onSubmit={event => { event.preventDefault(); if (available) onExplain(question); }}><label htmlFor="image-question">Question about this image <span className="optional-label">(optional)</span></label><textarea id="image-question" aria-label="Question about this image" rows={2} maxLength={600} value={question} onChange={event => setQuestion(event.target.value)} placeholder="What does this code do?"/><button className="primary full" type="submit" disabled={busy || !available}>Explain image</button></form>
    {answer && <article className="image-answer"><p className="image-provenance">{demo ? 'Demonstration · image was not analyzed' : 'Based on the selected image'}</p><h3>{answer.title}</h3><p className="image-answer-text">{answer.explanation}</p>{answer.visibleText.length > 0 && <details><summary>Text the AI could read</summary><pre>{answer.visibleText.join('\n')}</pre></details>}{answer.uncertainty && <p className="quiet-note">{answer.uncertainty}</p>}<p className="quiet-note">This explains visible content; repository implementation beyond the image was not inspected.</p></article>}
  </section>;
}

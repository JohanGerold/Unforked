import type { ContributorProfile, LearningPath, Source } from '@unforked/contracts';

const normalized = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
const priorityLabel = { core: 'Core knowledge', area_specific: 'For this area' };
const depthLabel = { basic: 'Basics', working: 'Working knowledge', advanced: 'Advanced knowledge' };

export function KnowledgeRoadmap({ data, profile, sources }: { data: LearningPath; profile: ContributorProfile; sources: Source[] }) {
  const known = new Set(profile.knownConcepts.map(normalized));
  const topics = (concepts: string[]) => <ul className="knowledge-topics">{concepts.map((concept, index) => <li key={index}><span>{concept}</span>{known.has(normalized(concept)) && <span className="profile-match">Listed in your profile</span>}</li>)}</ul>;
  const evidence = (ids: string[]) => <p className="knowledge-evidence">Based on {ids.map((id, index) => { const source = sources.find(item => item.id === id); return source ? <span key={id}>{index > 0 && ' · '}<a href={source.url} target="_blank" rel="noreferrer">{source.label.replace(/^(?:Dependency manifest|Source sample|Contribution guide): /, '')}</a></span> : null; })}</p>;
  return <>
    <h2>What to learn</h2><p className="intro">{data.overview}</p>
    <p className="quiet-note knowledge-profile-note">{known.size ? 'Concepts you listed in your profile are marked. Other topics may already be familiar.' : 'Add known concepts in Your skills to highlight familiar topics. Unlisted knowledge is treated as unknown.'}</p>
    {data.languages.map((language, index) => <article className="knowledge-language" key={index}>
      <div className="knowledge-heading"><h3>{language.name}</h3><span>{priorityLabel[language.priority]}</span></div>
      <p className="knowledge-depth">{depthLabel[language.depth]}</p><p className="knowledge-reason">{language.reason}</p>
      <h4>Language concepts</h4>{topics(language.concepts)}
      {language.libraries.length > 0 && <div className="knowledge-libraries"><h4>Libraries</h4>{language.libraries.map((library, libraryIndex) => <section className="knowledge-library" key={libraryIndex}><div className="knowledge-heading"><h5>{library.name}</h5><span>{priorityLabel[library.priority]}</span></div>{topics(library.concepts)}{evidence(library.sourceIds)}</section>)}</div>}
      {evidence(language.sourceIds)}
    </article>)}
    {data.supportingSkills.length > 0 && <section className="knowledge-support"><h3>Supporting skills</h3>{data.supportingSkills.map((skill, index) => <article key={index}><h4>{skill.name}</h4><p className="knowledge-reason">{skill.reason}</p>{topics(skill.concepts)}{evidence(skill.sourceIds)}</article>)}</section>}
    {data.languages.length === 0 && <p className="quiet-note">There wasn’t enough evidence to verify the project’s language requirements.</p>}
    {data.limitations.length > 0 && <details className="limitations knowledge-limits"><summary>Evidence and limits</summary><ul>{data.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details>}
  </>;
}

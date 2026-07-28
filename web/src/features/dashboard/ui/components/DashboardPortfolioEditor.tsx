import {
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Heart,
  Languages,
  Link2,
  MapPin,
  Plus,
  Presentation,
  Sparkles,
  X,
} from 'lucide-react';
import { lazy, memo, Suspense, useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';

import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import type { UserProfile } from '@/features/users/model/user.types';
import PortfolioTagEditor from './PortfolioTagEditor';
import type { useDashboardPage } from '../pages/useDashboardPage';

type DashboardPageState = ReturnType<typeof useDashboardPage>;

type DashboardPortfolioEditorProps = Pick<
  DashboardPageState,
  | 'addEducation'
  | 'addExperience'
  | 'addHandle'
  | 'generalForm'
  | 'handleGeneralSubmit'
  | 'handleProfessionalSubmit'
  | 'isBusy'
  | 'professionalForm'
  | 'removeEducation'
  | 'removeExperience'
  | 'removeHandle'
  | 'updateAddressField'
  | 'updateEducationField'
  | 'updateExperienceField'
  | 'updateHandleField'
  | 'updateGeneralField'
  | 'updateProfessionalField'
  | 'user'
>;

type PortfolioTab = 'info' | 'skills' | 'handles' | 'experience' | 'education' | 'interests' | 'language';
type ProfessionalTextField = 'skills' | 'interests' | 'languages';

const portfolioTabs: Array<{ id: PortfolioTab; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'skills', label: 'Skills' },
  { id: 'handles', label: 'Handles' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'interests', label: 'Interests' },
  { id: 'language', label: 'Language' },
];

const skillSuggestions = ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript', 'MongoDB'];
const interestSuggestions = [
  'AI & Machine Learning',
  'Web Development',
  'Mobile Apps',
  'Game Development',
  'Blockchain',
  'Cloud Computing',
  'DevOps',
  'Open Source',
  'UI/UX Design',
  'Data Science',
];
const languageSuggestions = ['Hindi', 'English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Portuguese'];
const DashboardPortfolioPreviewModal = lazy(() => import('./DashboardPortfolioPreviewModal'));

const SaveStatus = memo(({ isSaving, label }: { isSaving: boolean; label: string }) => (
  <small>{isSaving ? <LoadingSpinner inline label="Saving portfolio" size={13} /> : label}</small>
));

SaveStatus.displayName = 'SaveStatus';

const inputChange = (value: string): ChangeEvent<HTMLInputElement> => ({
  target: { value },
} as ChangeEvent<HTMLInputElement>);

const hasExperience = (experience: { companyName: string; role: string; timePeriod: string }) => (
  Boolean(experience.companyName.trim() || experience.role.trim() || experience.timePeriod.trim())
);

const hasEducation = (education: { collegeName: string; course: string; timePeriod: string }) => (
  Boolean(education.collegeName.trim() || education.course.trim() || education.timePeriod.trim())
);

const hasHandle = (handle: { label: string; link: string }) => (
  Boolean(handle.label.trim() || handle.link.trim())
);

const DashboardPortfolioEditor = ({
  addEducation,
  addExperience,
  addHandle,
  generalForm,
  handleGeneralSubmit,
  handleProfessionalSubmit,
  isBusy,
  professionalForm,
  removeEducation,
  removeExperience,
  removeHandle,
  updateAddressField,
  updateEducationField,
  updateExperienceField,
  updateHandleField,
  updateGeneralField,
  updateProfessionalField,
  user,
}: DashboardPortfolioEditorProps) => {
  const [activeTab, setActiveTab] = useState<PortfolioTab>('info');
  const [isTabMenuOpen, setTabMenuOpen] = useState(false);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [focusedGeneralField, setFocusedGeneralField] = useState<'headline' | 'about' | 'city' | 'state' | 'country' | null>(null);
  const [addingExperienceIndex, setAddingExperienceIndex] = useState<number | null>(null);
  const [addingEducationIndex, setAddingEducationIndex] = useState<number | null>(null);
  const [addingHandleIndex, setAddingHandleIndex] = useState<number | null>(null);
  const professionalFormRef = useRef<HTMLFormElement>(null);
  const addressIsFocused = focusedGeneralField === 'city' || focusedGeneralField === 'state' || focusedGeneralField === 'country';

  const scheduleProfessionalSave = useCallback(() => {
    window.setTimeout(() => professionalFormRef.current?.requestSubmit(), 0);
  }, []);

  const setProfessionalValue = useCallback((field: ProfessionalTextField, value: string) => {
    updateProfessionalField(field)(inputChange(value));
  }, [updateProfessionalField]);

  const handleSkillsChange = useCallback((value: string) => {
    setProfessionalValue('skills', value);
  }, [setProfessionalValue]);

  const handleInterestsChange = useCallback((value: string) => {
    setProfessionalValue('interests', value);
  }, [setProfessionalValue]);

  const handleLanguagesChange = useCallback((value: string) => {
    setProfessionalValue('languages', value);
  }, [setProfessionalValue]);

  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const beginAddingExperience = () => {
    const emptyIndex = professionalForm.experiences.findIndex((experience) => !hasExperience(experience));
    if (emptyIndex >= 0) {
      setAddingExperienceIndex(emptyIndex);
      return;
    }

    const nextIndex = professionalForm.experiences.length;
    addExperience();
    setAddingExperienceIndex(nextIndex);
  };

  const beginAddingEducation = () => {
    const emptyIndex = professionalForm.educations.findIndex((education) => !hasEducation(education));
    if (emptyIndex >= 0) {
      setAddingEducationIndex(emptyIndex);
      return;
    }

    const nextIndex = professionalForm.educations.length;
    addEducation();
    setAddingEducationIndex(nextIndex);
  };

  const beginAddingHandle = () => {
    const emptyIndex = professionalForm.handles.findIndex((handle) => !hasHandle(handle));
    if (emptyIndex >= 0) {
      setAddingHandleIndex(emptyIndex);
      return;
    }

    const nextIndex = professionalForm.handles.length;
    addHandle();
    setAddingHandleIndex(nextIndex);
  };

  const experienceRows = useMemo(
    () => professionalForm.experiences
      .map((experience, index) => ({ experience, index }))
      .filter(({ experience, index }) => index !== addingExperienceIndex && hasExperience(experience)),
    [addingExperienceIndex, professionalForm.experiences],
  );

  const educationRows = useMemo(
    () => professionalForm.educations
      .map((education, index) => ({ education, index }))
      .filter(({ education, index }) => index !== addingEducationIndex && hasEducation(education)),
    [addingEducationIndex, professionalForm.educations],
  );

  const handleRows = useMemo(
    () => professionalForm.handles
      .map((handle, index) => ({ handle, index }))
      .filter(({ handle, index }) => index !== addingHandleIndex && hasHandle(handle)),
    [addingHandleIndex, professionalForm.handles],
  );

  const addingExperience = useMemo(
    () => addingExperienceIndex === null ? null : professionalForm.experiences[addingExperienceIndex],
    [addingExperienceIndex, professionalForm.experiences],
  );
  const addingEducation = useMemo(
    () => addingEducationIndex === null ? null : professionalForm.educations[addingEducationIndex],
    [addingEducationIndex, professionalForm.educations],
  );
  const addingHandle = useMemo(
    () => addingHandleIndex === null ? null : professionalForm.handles[addingHandleIndex],
    [addingHandleIndex, professionalForm.handles],
  );
  const activeTabLabel = useMemo(
    () => portfolioTabs.find((tab) => tab.id === activeTab)?.label || 'Info',
    [activeTab],
  );

  const finishAddingExperience = () => {
    if (!addingExperience?.companyName.trim() || !addingExperience.timePeriod.trim()) return;
    setAddingExperienceIndex(null);
    scheduleProfessionalSave();
  };

  const finishAddingEducation = () => {
    if (!addingEducation?.collegeName.trim() || !addingEducation.course.trim() || !addingEducation.timePeriod.trim()) return;
    setAddingEducationIndex(null);
    scheduleProfessionalSave();
  };

  const finishAddingHandle = () => {
    if (!addingHandle?.label.trim() || !addingHandle.link.trim()) return;
    setAddingHandleIndex(null);
    scheduleProfessionalSave();
  };

  return (
    <div className="portfolio-builder-v1">
      <div className="portfolio-builder-v1__inner">
        <section className="portfolio-header-v1 portfolio-header-v1--compact">
          <nav className="portfolio-header-v1__nav" aria-label="Portfolio sections">
            {portfolioTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setTabMenuOpen(false);
                }}
                className={activeTab === tab.id ? 'is-active' : ''}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className={isTabMenuOpen ? 'portfolio-section-select-v1 is-open' : 'portfolio-section-select-v1'}>
            <button
              type="button"
              className="portfolio-section-select-v1__trigger"
              onClick={() => setTabMenuOpen((current) => !current)}
              aria-expanded={isTabMenuOpen}
              aria-haspopup="listbox"
            >
              <span>{activeTabLabel}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {isTabMenuOpen && (
              <div className="portfolio-section-select-v1__menu" role="listbox" aria-label="Portfolio sections">
                {portfolioTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="option"
                    aria-selected={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setTabMenuOpen(false);
                    }}
                    className={activeTab === tab.id ? 'is-active' : ''}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" className="button--icon portfolio-preview-button-v1" onClick={openPreview} aria-label="Preview portfolio">
            <Presentation size={17} aria-hidden="true" />
          </Button>
        </section>

        <section className="portfolio-editor-card-v1">
          {activeTab === 'info' ? (
            <form onSubmit={handleGeneralSubmit} className="portfolio-general-v1">
              <div className="portfolio-section-v1">
                <div className="portfolio-section-v1__label-row">
                  <label htmlFor="portfolio-headline">Headline<span>*</span></label>
                  {focusedGeneralField === 'headline' && <SaveStatus isSaving={isBusy} label="Autosaves" />}
                </div>
                <div className="portfolio-field-v1">
                  <Sparkles size={20} aria-hidden="true" />
                  <Input
                    id="portfolio-headline"
                    value={generalForm.headline}
                    onChange={updateGeneralField('headline')}
                    onFocus={() => setFocusedGeneralField('headline')}
                    onBlur={() => setFocusedGeneralField(null)}
                    placeholder="Full Stack Developer | React & Node.js Enthusiast"
                    maxLength={100}
                    required
                  />
                </div>
                <p className="portfolio-field-v1__count">{generalForm.headline.length}/100 characters</p>
              </div>

              <div className="portfolio-section-v1">
                <div className="portfolio-section-v1__label-row">
                  <label htmlFor="portfolio-about">About<span>*</span></label>
                  {focusedGeneralField === 'about' && <SaveStatus isSaving={isBusy} label="Autosaves" />}
                </div>
                <div className="portfolio-field-v1 portfolio-field-v1--textarea">
                  <FileText size={20} aria-hidden="true" />
                  <textarea
                    id="portfolio-about"
                    value={generalForm.about}
                    onChange={updateGeneralField('about')}
                    onFocus={() => setFocusedGeneralField('about')}
                    onBlur={() => setFocusedGeneralField(null)}
                    placeholder="Tell us about yourself, your journey, skills, and what drives you as a developer..."
                    rows={6}
                    maxLength={500}
                    required
                  />
                </div>
                <p className="portfolio-field-v1__count">{generalForm.about.length}/500 characters</p>
              </div>

              <div className="portfolio-section-v1">
                <div className="portfolio-section-v1__label-row">
                  <label>Address</label>
                  {addressIsFocused && <SaveStatus isSaving={isBusy} label="Autosaves" />}
                </div>
                <div className="portfolio-address-grid-v1">
                  <label htmlFor="portfolio-city">
                    <span>City</span>
                    <Input
                      id="portfolio-city"
                      value={generalForm.address.city}
                      onChange={updateAddressField('city')}
                      onFocus={() => setFocusedGeneralField('city')}
                      onBlur={() => setFocusedGeneralField(null)}
                      placeholder="City"
                    />
                  </label>
                  <label htmlFor="portfolio-state">
                    <span>State</span>
                    <Input
                      id="portfolio-state"
                      value={generalForm.address.state}
                      onChange={updateAddressField('state')}
                      onFocus={() => setFocusedGeneralField('state')}
                      onBlur={() => setFocusedGeneralField(null)}
                      placeholder="State"
                    />
                  </label>
                  <label htmlFor="portfolio-country">
                    <span>Country</span>
                    <Input
                      id="portfolio-country"
                      value={generalForm.address.country}
                      onChange={updateAddressField('country')}
                      onFocus={() => setFocusedGeneralField('country')}
                      onBlur={() => setFocusedGeneralField(null)}
                      placeholder="Country"
                    />
                  </label>
                </div>
                <p className="portfolio-field-v1__count"><MapPin size={13} aria-hidden="true" />Shown below your headline on profile preview.</p>
              </div>
            </form>
          ) : (
            <form ref={professionalFormRef} onSubmit={handleProfessionalSubmit}>
              {activeTab === 'skills' && (
                <PortfolioTagEditor
                  countLabel="skills"
                  isSaving={isBusy}
                  label="Skills"
                  actionNoun=" skill"
                  countSuffix=" added"
                  onCommit={scheduleProfessionalSave}
                  onValueChange={handleSkillsChange}
                  placeholder="Type a skill and press comma, space, or enter..."
                  showSuggestionsBelow={1}
                  suggestionLabel="Popular skills:"
                  suggestions={skillSuggestions}
                  value={professionalForm.skills}
                />
              )}

              {activeTab === 'handles' && (
                <div className="portfolio-section-v1">
                  <div className="portfolio-section-v1__label-row">
                    <label>Handles<span>*</span></label>
                    <SaveStatus isSaving={isBusy} label="Up to date!" />
                  </div>

                  <div className="portfolio-timeline-editor-v1">
                    {handleRows.map(({ handle, index }) => (
                      <article key={`${handle.label}-${index}`}>
                        <i><Link2 size={20} aria-hidden="true" /></i>
                        <span>
                          <strong>{handle.label}</strong>
                          <small><ExternalLink size={14} aria-hidden="true" />{handle.link}</small>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeHandle(index);
                            scheduleProfessionalSave();
                          }}
                          aria-label="Remove handle"
                        ><X size={16} aria-hidden="true" /></button>
                      </article>
                    ))}
                  </div>

                  {addingHandleIndex !== null && addingHandle ? (
                    <div className="portfolio-add-form-v1">
                      <label>Label<Input value={addingHandle.label} onChange={updateHandleField(addingHandleIndex, 'label')} placeholder="GitHub, Portfolio, LinkedIn..." autoFocus /></label>
                      <label>Link<Input value={addingHandle.link} onChange={updateHandleField(addingHandleIndex, 'link')} placeholder="https://github.com/username" /></label>
                      <div>
                        <Button onClick={finishAddingHandle}>Add Handle</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            removeHandle(addingHandleIndex);
                            setAddingHandleIndex(null);
                          }}
                        >Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="portfolio-add-button-v1" onClick={beginAddingHandle}>
                      <i><Plus size={20} aria-hidden="true" /></i><span>Add Handle</span>
                    </button>
                  )}
                  <p className="portfolio-field-v1__count">{handleRows.length} {handleRows.length === 1 ? 'handle' : 'handles'} added</p>
                </div>
              )}

              {activeTab === 'interests' && (
                <PortfolioTagEditor
                  countLabel="interests"
                  icon={Heart}
                  isSaving={isBusy}
                  label="Interests"
                  onCommit={scheduleProfessionalSave}
                  onValueChange={handleInterestsChange}
                  placeholder="Type an interest and press comma, space, or enter..."
                  showSuggestionsBelow={3}
                  suggestionLabel="Popular interests:"
                  suggestions={interestSuggestions}
                  value={professionalForm.interests}
                />
              )}

              {activeTab === 'language' && (
                <PortfolioTagEditor
                  countLabel="languages"
                  icon={Languages}
                  isSaving={isBusy}
                  label="Languages"
                  onCommit={scheduleProfessionalSave}
                  onValueChange={handleLanguagesChange}
                  placeholder="Type a language and press comma, space, or enter..."
                  showSuggestionsBelow={3}
                  suggestionLabel="Common languages:"
                  suggestions={languageSuggestions}
                  value={professionalForm.languages}
                />
              )}

              {activeTab === 'experience' && (
                <div className="portfolio-section-v1">
                  <div className="portfolio-section-v1__label-row">
                    <label>Experience<span>*</span></label>
                    <SaveStatus isSaving={isBusy} label="Up to date!" />
                  </div>

                  <div className="portfolio-timeline-editor-v1">
                    {experienceRows.map(({ experience, index }) => (
                      <article key={`${experience.companyName}-${index}`}>
                        <i><Briefcase size={20} aria-hidden="true" /></i>
                        <span>
                          <strong>{experience.companyName}</strong>
                          {experience.role && <small><Briefcase size={14} aria-hidden="true" />{experience.role}</small>}
                          <small><Calendar size={14} aria-hidden="true" />{experience.timePeriod}</small>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeExperience(index);
                            scheduleProfessionalSave();
                          }}
                          aria-label="Remove experience"
                        ><X size={16} aria-hidden="true" /></button>
                      </article>
                    ))}
                  </div>

                  {addingExperienceIndex !== null && addingExperience ? (
                    <div className="portfolio-add-form-v1">
                      <label>Company Name<Input value={addingExperience.companyName} onChange={updateExperienceField(addingExperienceIndex, 'companyName')} placeholder="Google, Microsoft, Startup Inc..." autoFocus /></label>
                      <label>Role<Input value={addingExperience.role} onChange={updateExperienceField(addingExperienceIndex, 'role')} placeholder="Frontend Developer, SDE Intern..." /></label>
                      <label>Time Period<Input value={addingExperience.timePeriod} onChange={updateExperienceField(addingExperienceIndex, 'timePeriod')} placeholder="Jan 2022 - Present" /></label>
                      <div>
                        <Button onClick={finishAddingExperience}>Add Experience</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            removeExperience(addingExperienceIndex);
                            setAddingExperienceIndex(null);
                          }}
                        >Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="portfolio-add-button-v1" onClick={beginAddingExperience}>
                      <i><Plus size={20} aria-hidden="true" /></i><span>Add Experience</span>
                    </button>
                  )}
                  <p className="portfolio-field-v1__count">{experienceRows.length} {experienceRows.length === 1 ? 'experience' : 'experiences'} added</p>
                </div>
              )}

              {activeTab === 'education' && (
                <div className="portfolio-section-v1">
                  <div className="portfolio-section-v1__label-row">
                    <label>Education<span>*</span></label>
                    <SaveStatus isSaving={isBusy} label="Up to date!" />
                  </div>

                  <div className="portfolio-timeline-editor-v1">
                    {educationRows.map(({ education, index }) => (
                      <article key={`${education.collegeName}-${index}`}>
                        <i><GraduationCap size={20} aria-hidden="true" /></i>
                        <span>
                          <strong>{education.collegeName}</strong>
                          <small><BookOpen size={14} aria-hidden="true" />{education.course}</small>
                          <small><Calendar size={14} aria-hidden="true" />{education.timePeriod}</small>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeEducation(index);
                            scheduleProfessionalSave();
                          }}
                          aria-label="Remove education"
                        ><X size={16} aria-hidden="true" /></button>
                      </article>
                    ))}
                  </div>

                  {addingEducationIndex !== null && addingEducation ? (
                    <div className="portfolio-add-form-v1">
                      <label>College/University Name<Input value={addingEducation.collegeName} onChange={updateEducationField(addingEducationIndex, 'collegeName')} placeholder="MIT, Stanford, IIT Delhi..." autoFocus /></label>
                      <label>Course/Degree<Input value={addingEducation.course} onChange={updateEducationField(addingEducationIndex, 'course')} placeholder="B.Tech in Computer Science" /></label>
                      <label>Time Period<Input value={addingEducation.timePeriod} onChange={updateEducationField(addingEducationIndex, 'timePeriod')} placeholder="2018 - 2022" /></label>
                      <div>
                        <Button onClick={finishAddingEducation}>Add Education</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            removeEducation(addingEducationIndex);
                            setAddingEducationIndex(null);
                          }}
                        >Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="portfolio-add-button-v1" onClick={beginAddingEducation}>
                      <i><Plus size={20} aria-hidden="true" /></i><span>Add Education</span>
                    </button>
                  )}
                  <p className="portfolio-field-v1__count">{educationRows.length} {educationRows.length === 1 ? 'education' : 'educations'} added</p>
                </div>
              )}
            </form>
          )}
        </section>
      </div>

      <Suspense fallback={null}>
        {isPreviewOpen && (
          <DashboardPortfolioPreviewModal
            isOpen={isPreviewOpen}
            onClose={closePreview}
            user={(user as UserProfile | null) || null}
          />
        )}
      </Suspense>
    </div>
  );
};

export default DashboardPortfolioEditor;

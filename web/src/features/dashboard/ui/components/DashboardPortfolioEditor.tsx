import {
  BookOpen,
  Briefcase,
  Calendar,
  FileText,
  GraduationCap,
  Heart,
  Languages,
  Plus,
  Presentation,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import type { UserProfile } from '@/features/users/model/user.types';
import DashboardPortfolioPreviewModal from './DashboardPortfolioPreviewModal';
import PortfolioTagEditor from './PortfolioTagEditor';
import type { useDashboardPage } from '../pages/useDashboardPage';

type DashboardPageState = ReturnType<typeof useDashboardPage>;

type DashboardPortfolioEditorProps = Pick<
  DashboardPageState,
  | 'addEducation'
  | 'addExperience'
  | 'generalForm'
  | 'handleGeneralSubmit'
  | 'handleProfessionalSubmit'
  | 'isBusy'
  | 'professionalForm'
  | 'removeEducation'
  | 'removeExperience'
  | 'updateEducationField'
  | 'updateExperienceField'
  | 'updateGeneralField'
  | 'updateProfessionalField'
  | 'user'
>;

type PortfolioTab = 'info' | 'skills' | 'experience' | 'education' | 'interests' | 'language';
type ProfessionalTextField = 'skills' | 'interests' | 'languages';

const portfolioTabs: Array<{ id: PortfolioTab; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'skills', label: 'Skills' },
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

const inputChange = (value: string): ChangeEvent<HTMLInputElement> => ({
  target: { value },
} as ChangeEvent<HTMLInputElement>);

const hasExperience = (experience: { companyName: string; timePeriod: string }) => (
  Boolean(experience.companyName.trim() || experience.timePeriod.trim())
);

const hasEducation = (education: { collegeName: string; course: string; timePeriod: string }) => (
  Boolean(education.collegeName.trim() || education.course.trim() || education.timePeriod.trim())
);

const DashboardPortfolioEditor = ({
  addEducation,
  addExperience,
  generalForm,
  handleGeneralSubmit,
  handleProfessionalSubmit,
  isBusy,
  professionalForm,
  removeEducation,
  removeExperience,
  updateEducationField,
  updateExperienceField,
  updateGeneralField,
  updateProfessionalField,
  user,
}: DashboardPortfolioEditorProps) => {
  const [activeTab, setActiveTab] = useState<PortfolioTab>('info');
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [focusedGeneralField, setFocusedGeneralField] = useState<'headline' | 'about' | null>(null);
  const [addingExperienceIndex, setAddingExperienceIndex] = useState<number | null>(null);
  const [addingEducationIndex, setAddingEducationIndex] = useState<number | null>(null);
  const generalFormRef = useRef<HTMLFormElement>(null);
  const professionalFormRef = useRef<HTMLFormElement>(null);

  const scheduleProfessionalSave = () => {
    window.setTimeout(() => professionalFormRef.current?.requestSubmit(), 0);
  };

  const setProfessionalValue = (field: ProfessionalTextField, value: string) => {
    updateProfessionalField(field)(inputChange(value));
  };

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

  const experienceRows = professionalForm.experiences
    .map((experience, index) => ({ experience, index }))
    .filter(({ experience, index }) => index !== addingExperienceIndex && hasExperience(experience));

  const educationRows = professionalForm.educations
    .map((education, index) => ({ education, index }))
    .filter(({ education, index }) => index !== addingEducationIndex && hasEducation(education));

  const addingExperience = addingExperienceIndex === null
    ? null
    : professionalForm.experiences[addingExperienceIndex];
  const addingEducation = addingEducationIndex === null
    ? null
    : professionalForm.educations[addingEducationIndex];

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

  return (
    <div className="portfolio-builder-v1">
      <div className="portfolio-builder-v1__inner">
        <section className="portfolio-info-card-v1">
          <span><Sparkles size={20} aria-hidden="true" /></span>
          <div>
            <strong>Make it stand out</strong>
            <p>Your portfolio is your first impression. Be authentic, highlight your strengths, and showcase what makes you unique as a developer.</p>
          </div>
        </section>

        <section className="portfolio-header-v1">
          <div className="portfolio-header-v1__top">
            <div className="portfolio-header-v1__title">
              <span><User size={20} aria-hidden="true" /></span>
              <div><p>Portfolio Builder</p><h2>Portfolio Details</h2></div>
            </div>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Presentation size={16} aria-hidden="true" />Preview
            </Button>
          </div>

          <nav className="portfolio-header-v1__nav" aria-label="Portfolio sections">
            {portfolioTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'is-active' : ''}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </section>

        <section className="portfolio-editor-card-v1">
          {activeTab === 'info' ? (
            <form ref={generalFormRef} onSubmit={handleGeneralSubmit} className="portfolio-general-v1">
              <div className="portfolio-section-v1">
                <div className="portfolio-section-v1__label-row">
                  <label htmlFor="portfolio-headline">Headline<span>*</span></label>
                  {focusedGeneralField === 'headline' && <small>{isBusy ? 'saving...' : 'Up to date!'}</small>}
                </div>
                <div className="portfolio-field-v1">
                  <Sparkles size={20} aria-hidden="true" />
                  <Input
                    id="portfolio-headline"
                    value={generalForm.headline}
                    onChange={updateGeneralField('headline')}
                    onFocus={() => setFocusedGeneralField('headline')}
                    onBlur={() => {
                      setFocusedGeneralField(null);
                      generalFormRef.current?.requestSubmit();
                    }}
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
                  {focusedGeneralField === 'about' && <small>{isBusy ? 'saving...' : 'Up to date!'}</small>}
                </div>
                <div className="portfolio-field-v1 portfolio-field-v1--textarea">
                  <FileText size={20} aria-hidden="true" />
                  <textarea
                    id="portfolio-about"
                    value={generalForm.about}
                    onChange={updateGeneralField('about')}
                    onFocus={() => setFocusedGeneralField('about')}
                    onBlur={() => {
                      setFocusedGeneralField(null);
                      generalFormRef.current?.requestSubmit();
                    }}
                    placeholder="Tell us about yourself, your journey, skills, and what drives you as a developer..."
                    rows={6}
                    maxLength={500}
                    required
                  />
                </div>
                <p className="portfolio-field-v1__count">{generalForm.about.length}/500 characters</p>
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
                  onValueChange={(value) => setProfessionalValue('skills', value)}
                  placeholder="Type a skill and press comma, space, or enter..."
                  showSuggestionsBelow={1}
                  suggestionLabel="Popular skills:"
                  suggestions={skillSuggestions}
                  value={professionalForm.skills}
                />
              )}

              {activeTab === 'interests' && (
                <PortfolioTagEditor
                  countLabel="interests"
                  icon={Heart}
                  isSaving={isBusy}
                  label="Interests"
                  onCommit={scheduleProfessionalSave}
                  onValueChange={(value) => setProfessionalValue('interests', value)}
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
                  onValueChange={(value) => setProfessionalValue('languages', value)}
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
                    <small>{isBusy ? 'saving...' : 'Up to date!'}</small>
                  </div>

                  <div className="portfolio-timeline-editor-v1">
                    {experienceRows.map(({ experience, index }) => (
                      <article key={`${experience.companyName}-${index}`}>
                        <i><Briefcase size={20} aria-hidden="true" /></i>
                        <span>
                          <strong>{experience.companyName}</strong>
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
                    <small>{isBusy ? 'saving...' : 'Up to date!'}</small>
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

      <DashboardPortfolioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setPreviewOpen(false)}
        user={(user as UserProfile | null) || null}
      />
    </div>
  );
};

export default DashboardPortfolioEditor;

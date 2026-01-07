import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobService } from '../../services/api';
import './Admin.css';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

const jobTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'internship', label: 'Internship' },
];

const jobLevelOptions = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive' },
];

const educationOptions = [
  { value: '', label: 'Select Relevant Education' },
  { value: 'high_school', label: 'High School' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
];

const currencyOptions = ['AED', 'USD', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];
const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'no_preference', label: 'No Preference' },
];

const countryOptions = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'United States', 'India', 'United Kingdom'];

const initialFormState = {
  title: '',
  reference_number: '',
  status: 'draft',
  job_type: 'full_time',
  job_level: 'mid',
  designation: '',
  industry: '',
  sub_industry: '',
  functional_area: '',
  description: '',
  responsibilities: '',
  candidate_profile: '',
  keywords: [],
  company_name: 'Company',
  department: '',
  location: '',
  vacancies: 1,
  state: '',
  city: '',
  job_country: '',
  min_experience_years: '',
  max_experience_years: '',
  min_gcc_experience_years: 0,
  required_education: '',
  preferred_education: '',
  nationality: '',
  gender_preference: 'no_preference',
  visa_requirement: '',
  preferred_locations: [],
  required_skills: [],
  preferred_skills: [],
  salary_min: '',
  salary_max: '',
  salary_currency: 'AED',
  hide_salary: false,
  other_benefits: '',
  is_remote: false,
  is_gcc_location: true,
};

const JobForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [skillInput, setSkillInput] = useState('');
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [preferredLocationInput, setPreferredLocationInput] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchJob();
    } else {
      setFormData((prev) => ({
        ...prev,
        reference_number: `JOB-${Date.now().toString().slice(-8)}`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const response = await jobService.getById(id);
      setFormData({
        ...initialFormState,
        ...response.data,
      });
    } catch (error) {
      console.error('Failed to fetch job:', error);
      navigate('/admin/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addListItem = (field, value, clear) => {
    if (!value || !value.trim()) return;
    const trimmed = value.trim();
    if (formData[field].includes(trimmed)) {
      if (clear) clear('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], trimmed],
    }));
    if (clear) clear('');
  };

  const removeListItem = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (statusOverride) => {
    setSaving(true);
    try {
      const locationParts = [formData.city, formData.state, formData.job_country].filter(Boolean);
      const location = locationParts.join(', ');

      const payload = {
        ...formData,
        status: statusOverride || formData.status,
        location,
        salary_min: formData.salary_min === '' ? null : parseInt(formData.salary_min, 10),
        salary_max: formData.salary_max === '' ? null : parseInt(formData.salary_max, 10),
        vacancies: formData.vacancies === '' ? 0 : parseInt(formData.vacancies, 10),
        min_experience_years: formData.min_experience_years === '' ? 0 : parseInt(formData.min_experience_years, 10),
        max_experience_years: formData.max_experience_years === '' ? 0 : parseInt(formData.max_experience_years, 10),
        min_gcc_experience_years: formData.min_gcc_experience_years === '' ? 0 : parseInt(formData.min_gcc_experience_years, 10),
      };

      if (isEditing) {
        await jobService.update(id, payload);
      } else {
        await jobService.create(payload);
      }
      navigate('/admin/jobs');
    } catch (error) {
      console.error('Failed to save job:', error);
      alert('Failed to save job. Please check your input.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="job-form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Posting</h1>
          <p className="page-subtitle">Fill all fields as shown in the provided layout.</p>
        </div>
      </div>

      <div className="job-form-card">
        <form onSubmit={(e) => e.preventDefault()}>
          <section className="job-section">
            <div className="section-header">
              <div className="section-icon folder"></div>
              <h2>Job Details</h2>
            </div>
            <div className="section-grid">
              <div className="field full">
                <label>Job Title *</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter Job Title"
                  required
                />
              </div>

              <div className="field">
                <label>Job Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Job Type</label>
                <select name="job_type" value={formData.job_type} onChange={handleChange}>
                  {jobTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Industry *</label>
                <input
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="Select Industry"
                  required
                />
              </div>

              <div className="field">
                <label>Sub Industry</label>
                <input
                  name="sub_industry"
                  value={formData.sub_industry}
                  onChange={handleChange}
                  placeholder="Select Sub Industry"
                />
              </div>

              <div className="field">
                <label>Functional Area *</label>
                <input
                  name="functional_area"
                  value={formData.functional_area}
                  onChange={handleChange}
                  placeholder="Select Functional Area"
                  required
                />
              </div>

              <div className="field">
                <label>Designation *</label>
                <input
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="Select Designation"
                  required
                />
              </div>

              <div className="field full">
                <label>Job Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Job Description"
                  rows={3}
                  required
                />
              </div>

              <div className="field full">
                <label>Roles and Responsibilities</label>
                <textarea
                  name="responsibilities"
                  value={formData.responsibilities}
                  onChange={handleChange}
                  placeholder="Write roles and responsibilities..."
                  rows={4}
                />
              </div>

              <div className="field full">
                <label>Desired Candidate Profile</label>
                <textarea
                  name="candidate_profile"
                  value={formData.candidate_profile}
                  onChange={handleChange}
                  placeholder="Write desired candidate profile..."
                  rows={4}
                />
              </div>

              <div className="field">
                <label>Keywords</label>
                <div className="tags-input">
                  {formData.keywords.map((item) => (
                    <span key={item} className="tag-pill">
                      {item}
                      <button type="button" onClick={() => removeListItem('keywords', item)}>×</button>
                    </span>
                  ))}
                  <input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addListItem('keywords', keywordInput, setKeywordInput);
                      }
                    }}
                    placeholder="Enter Keywords"
                  />
                </div>
              </div>

              <div className="field">
                <label>No. of Vacancies *</label>
                <input
                  type="number"
                  name="vacancies"
                  min="1"
                  value={formData.vacancies}
                  onChange={handleChange}
                  placeholder="Enter Vacancies"
                  required
                />
              </div>

              <div className="field">
                <label>Job Country *</label>
                <select name="job_country" value={formData.job_country} onChange={handleChange} required>
                  <option value="">Select Country</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>State *</label>
                <input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Select State"
                  required
                />
              </div>

              <div className="field">
                <label>City</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Select City"
                />
              </div>
            </div>
          </section>

          <section className="job-section">
            <div className="section-header">
              <div className="section-icon user"></div>
              <h2>Desired Candidate Profile</h2>
            </div>
            <div className="section-grid">
              <div className="field gender-field">
                <label>Gender</label>
                <div className="gender-pills">
                  {genderOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={formData.gender_preference === opt.value ? 'pill active' : 'pill'}
                      onClick={() => setFormData((prev) => ({ ...prev, gender_preference: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Nationality</label>
                <select name="nationality" value={formData.nationality} onChange={handleChange}>
                  <option value="">Select Nationality</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="field full">
                <label>Visa Requirement / Sponsorship</label>
                <select name="visa_requirement" value={formData.visa_requirement} onChange={handleChange}>
                  <option value="">No Specific Requirement</option>
                  <option value="valid_work_visa_required">Valid Work Visa Required</option>
                  <option value="visa_sponsorship_available">Visa Sponsorship Available</option>
                  <option value="own_visa_preferred">Own Visa Preferred</option>
                  <option value="transferable_visa_required">Transferable Visa Required</option>
                  <option value="gcc_nationals_only">GCC Nationals Only</option>
                </select>
              </div>

              <div className="field experience-field">
                <label>Past Work Experience</label>
                <div className="range-row">
                  <input
                    type="number"
                    name="min_experience_years"
                    value={formData.min_experience_years}
                    onChange={handleChange}
                    placeholder="Minimum Experience (in years)"
                    min="0"
                  />
                  <span className="range-separator">To</span>
                  <input
                    type="number"
                    name="max_experience_years"
                    value={formData.max_experience_years}
                    onChange={handleChange}
                    placeholder="Maximum Experience (in years)"
                    min="0"
                  />
                </div>
              </div>

              <div className="field full">
                <label>Prefer candidate from these locations</label>
                <div className="tags-input">
                  {formData.preferred_locations.map((item) => (
                    <span key={item} className="tag-pill">
                      {item}
                      <button type="button" onClick={() => removeListItem('preferred_locations', item)}>×</button>
                    </span>
                  ))}
                  <input
                    value={preferredLocationInput}
                    onChange={(e) => setPreferredLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addListItem('preferred_locations', preferredLocationInput, setPreferredLocationInput);
                      }
                    }}
                    placeholder="Add locations"
                  />
                </div>
              </div>

              <div className="field full">
                <label>Education Details</label>
                <select name="required_education" value={formData.required_education} onChange={handleChange}>
                  {educationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="field full">
                <label>Required Skills</label>
                <div className="tags-input">
                  {formData.required_skills.map((skill) => (
                    <span key={skill} className="tag-pill">
                      {skill}
                      <button type="button" onClick={() => removeListItem('required_skills', skill)}>×</button>
                    </span>
                  ))}
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addListItem('required_skills', skillInput, setSkillInput);
                      }
                    }}
                    placeholder="Enter skills"
                  />
                </div>
              </div>

              <div className="field full">
                <label>Preferred Skills</label>
                <div className="tags-input">
                  {formData.preferred_skills.map((skill) => (
                    <span key={skill} className="tag-pill">
                      {skill}
                      <button type="button" onClick={() => removeListItem('preferred_skills', skill)}>×</button>
                    </span>
                  ))}
                  <input
                    value={preferredSkillInput}
                    onChange={(e) => setPreferredSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addListItem('preferred_skills', preferredSkillInput, setPreferredSkillInput);
                      }
                    }}
                    placeholder="Enter skills"
                  />
                </div>
              </div>

              <div className="field">
                <label>Job Level</label>
                <select name="job_level" value={formData.job_level} onChange={handleChange}>
                  {jobLevelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="job-section">
            <div className="section-header">
              <div className="section-icon salary"></div>
              <h2>Salary Details</h2>
            </div>
            <div className="section-grid">
              <div className="field">
                <label>Monthly Salary</label>
                <div className="range-row">
                  <select name="salary_currency" value={formData.salary_currency} onChange={handleChange}>
                    {currencyOptions.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="salary_min"
                    value={formData.salary_min}
                    onChange={handleChange}
                    placeholder="Minimum Salary"
                    min="0"
                  />
                  <input
                    type="number"
                    name="salary_max"
                    value={formData.salary_max}
                    onChange={handleChange}
                    placeholder="Maximum Salary"
                    min="0"
                  />
                </div>
              </div>

              <div className="field full checkbox-field">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="hide_salary"
                    checked={formData.hide_salary}
                    onChange={handleChange}
                  />
                  <span>Hide salary from Job Seekers (Hiding salary will give less number of applies)</span>
                </label>
              </div>

              <div className="field full">
                <label>Other Benefits</label>
                <input
                  name="other_benefits"
                  value={formData.other_benefits}
                  onChange={handleChange}
                  placeholder="Enter other benefits apart from salary"
                />
              </div>
            </div>
          </section>

          <div className="form-actions aligned">
            <button type="button" className="btn secondary" onClick={() => handleSubmit('draft')} disabled={saving}>
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" className="btn primary" onClick={() => handleSubmit('active')} disabled={saving}>
              {saving ? 'Saving...' : 'Post Job'}
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate('/admin/jobs')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobForm;

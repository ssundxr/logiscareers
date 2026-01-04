import React, { useState, useEffect, useRef } from 'react';
import { candidateService } from '../../services/api';
import './Candidate.css';

const MyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [workExperiences, setWorkExperiences] = useState([]);
  const [educationEntries, setEducationEntries] = useState([]);
  const [majorProjects, setMajorProjects] = useState([]);
  const [honorsAwards, setHonorsAwards] = useState([]);
  const [itSkills, setItSkills] = useState([]);
  
  const resumeInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await candidateService.getMyProfile();
      setProfile(response.data);
      setFormData(response.data);
      setWorkExperiences(response.data.experience_entries || []);
      setEducationEntries(response.data.education_entries || []);
      setMajorProjects(response.data.major_projects || []);
      setHonorsAwards(response.data.honors_awards || []);
      setItSkills(response.data.it_skill_certifications || []);
      setIsNewProfile(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.response?.status === 404) {
        setIsNewProfile(true);
        setFormData({
          professional_summary: '',
          current_location: '',
          nationality: '',
          mobile_number: '',
          alternative_mobile: '',
          alternative_email: '',
          linkedin_profile: '',
          current_salary: '',
          desired_monthly_salary: '',
          total_experience_months: 0,
          gcc_experience_months: 0,
          desired_availability_to_join: '',
          professional_skills: [],
          functional_skills: [],
          it_skills: [],
          languages_known: [],
          languages_spoken: '',
          gender: '',
          marital_status: '',
          driving_license: false,
          driving_license_issued_from: '',
          visa_status: '',
          religion: '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : '') : value
    }));
  };

  const handleSkillsChange = (field, value) => {
    const skills = value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({
      ...prev,
      [field]: skills
    }));
  };

  // Helper function to format date to YYYY-MM-DD or null
  const formatDate = (dateValue) => {
    if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
      return null;
    }
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // Try to parse and format
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Clean nested data by formatting dates properly
  const cleanNestedData = (items, dateFields) => {
    return items.map(item => {
      const cleaned = { ...item };
      // Remove id field if it's a new item (no id or empty id)
      if (!cleaned.id) {
        delete cleaned.id;
      }
      // Format date fields
      dateFields.forEach(field => {
        cleaned[field] = formatDate(cleaned[field]);
      });
      return cleaned;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const dataToSend = { ...formData };
      // Remove read-only and file fields
      delete dataToSend.cv_file;
      delete dataToSend.photo;
      delete dataToSend.id;
      delete dataToSend.user;
      delete dataToSend.registration_number;
      delete dataToSend.created_at;
      delete dataToSend.updated_at;
      delete dataToSend.education_entries;
      delete dataToSend.experience_entries;
      delete dataToSend.user_email;
      delete dataToSend.user_first_name;
      delete dataToSend.user_last_name;
      delete dataToSend.total_experience_years;
      delete dataToSend.gcc_experience_years;
      delete dataToSend.all_skills;
      delete dataToSend.major_projects;
      delete dataToSend.honors_awards;
      delete dataToSend.it_skill_certifications;
      
      // Format date fields in the main form
      if (dataToSend.date_of_birth) {
        dataToSend.date_of_birth = formatDate(dataToSend.date_of_birth);
      }
      if (dataToSend.visa_expiry) {
        dataToSend.visa_expiry = formatDate(dataToSend.visa_expiry);
      }
      
      // Add nested data with properly formatted dates
      dataToSend.experience = cleanNestedData(workExperiences, ['start_date', 'end_date']);
      dataToSend.education = cleanNestedData(educationEntries, ['start_date', 'end_date']);
      dataToSend.major_projects = cleanNestedData(majorProjects, ['start_date', 'end_date']);
      dataToSend.honors_awards = cleanNestedData(honorsAwards, ['date_issued']);
      dataToSend.it_skill_certifications = cleanNestedData(itSkills, ['issue_date', 'expiry_date']);
      
      const response = await candidateService.updateMyProfile(dataToSend);
      setProfile(response.data);
      setFormData(response.data);
      setWorkExperiences(response.data.experience_entries || []);
      setEducationEntries(response.data.education_entries || []);
      setMajorProjects(response.data.major_projects || []);
      setHonorsAwards(response.data.honors_awards || []);
      setItSkills(response.data.it_skill_certifications || []);
      setIsNewProfile(false);
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      const response = await candidateService.uploadResume(file);
      setProfile(response.data);
      setSuccess('Resume uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to upload resume:', error);
      setError('Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo size must be less than 2MB');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      const response = await candidateService.uploadPhoto(file);
      setProfile(response.data);
      setSuccess('Photo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1>My Profile</h1>
        <p>{isNewProfile ? 'Create your candidate profile' : 'Manage your candidate profile information'}</p>
      </div>

      {/* Success/Error Messages */}
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* Upload Section - Photo & Resume */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Photo & Resume</h2>
        </div>
        <div className="profile-card-body">
          <div className="upload-section">
            {/* Photo Upload */}
            <div className="upload-box">
              <div className="photo-preview">
                {profile?.photo ? (
                  <img src={profile.photo} alt="Profile" className="profile-photo" />
                ) : (
                  <div className="photo-placeholder">
                    <span>📷</span>
                    <p>No Photo</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <p className="upload-hint">Max 2MB, JPG/PNG</p>
            </div>

            {/* Resume Upload */}
            <div className="upload-box">
              <div className="resume-preview">
                {profile?.cv_file ? (
                  <div className="resume-uploaded">
                    <span>📄</span>
                    <p>Resume Uploaded</p>
                    <a href={profile.cv_file} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm">
                      View Resume
                    </a>
                  </div>
                ) : (
                  <div className="resume-placeholder">
                    <span>📄</span>
                    <p>No Resume</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={resumeInputRef}
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => resumeInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>
              <p className="upload-hint">Max 5MB, PDF/DOC/DOCX</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit}>
        {/* Professional Summary */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Professional Summary</h2>
          </div>
          <div className="profile-card-body">
            <div className="form-group">
              <textarea
                name="professional_summary"
                className="form-input"
                rows="5"
                value={formData.professional_summary || ''}
                onChange={handleChange}
                placeholder="Write a brief professional summary about yourself..."
              />
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Personal Information</h2>
          </div>
          <div className="profile-card-body">
            <div className="profile-grid">
              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  className="form-select"
                  value={formData.gender || ''}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Marital Status</label>
                <select
                  name="marital_status"
                  className="form-select"
                  value={formData.marital_status || ''}
                  onChange={handleChange}
                >
                  <option value="">Select status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  name="mobile_number"
                  className="form-input"
                  value={formData.mobile_number || ''}
                  onChange={handleChange}
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div className="form-group">
                <label>Alternative Mobile</label>
                <input
                  type="tel"
                  name="alternative_mobile"
                  className="form-input"
                  value={formData.alternative_mobile || ''}
                  onChange={handleChange}
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div className="form-group">
                <label>Alternative Email</label>
                <input
                  type="email"
                  name="alternative_email"
                  className="form-input"
                  value={formData.alternative_email || ''}
                  onChange={handleChange}
                  placeholder="alternative@email.com"
                />
              </div>
              <div className="form-group">
                <label>LinkedIn Profile</label>
                <input
                  type="url"
                  name="linkedin_profile"
                  className="form-input"
                  value={formData.linkedin_profile || ''}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="form-group">
                <label>Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  className="form-input"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  placeholder="Enter your nationality"
                />
              </div>
              <div className="form-group">
                <label>Religion</label>
                <input
                  type="text"
                  name="religion"
                  className="form-input"
                  value={formData.religion || ''}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Current Location</label>
                <input
                  type="text"
                  name="current_location"
                  className="form-input"
                  value={formData.current_location || ''}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>
              <div className="form-group">
                <label>Availability to Join</label>
                <select
                  name="desired_availability_to_join"
                  className="form-select"
                  value={formData.desired_availability_to_join || ''}
                  onChange={handleChange}
                >
                  <option value="">Select availability</option>
                  <option value="Immediate">Immediate</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="3 months">3 months</option>
                </select>
              </div>
              <div className="form-group">
                <label>Visa Status</label>
                <input
                  type="text"
                  name="visa_status"
                  className="form-input"
                  value={formData.visa_status || ''}
                  onChange={handleChange}
                  placeholder="e.g., Work Visa, Visit Visa"
                />
              </div>
              <div className="form-group">
                <label>Driving License</label>
                <select
                  name="driving_license"
                  className="form-select"
                  value={formData.driving_license ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({...prev, driving_license: e.target.value === 'true'}))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              {formData.driving_license && (
                <div className="form-group">
                  <label>Driving License Issued From</label>
                  <input
                    type="text"
                    name="driving_license_issued_from"
                    className="form-input"
                    value={formData.driving_license_issued_from || ''}
                    onChange={handleChange}
                    placeholder="United Arab Emirates"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Languages Spoken (comma-separated)</label>
                <input
                  type="text"
                  name="languages_spoken"
                  className="form-input"
                  value={formData.languages_spoken || ''}
                  onChange={handleChange}
                  placeholder="e.g., English, Hindi, Malayalam, Tamil"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Experience</h2>
          </div>
          <div className="profile-card-body">
            <div className="profile-grid">
              <div className="form-group">
                <label>Total Experience (months)</label>
                <input
                  type="number"
                  name="total_experience_months"
                  className="form-input"
                  value={formData.total_experience_months || ''}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>GCC Experience (months)</label>
                <input
                  type="number"
                  name="gcc_experience_months"
                  className="form-input"
                  value={formData.gcc_experience_months || ''}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Employment Details</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setWorkExperiences([...workExperiences, {
                job_title: '',
                company_name: '',
                location: '',
                industry: '',
                functional_area: '',
                start_date: '',
                end_date: '',
                is_current: false,
                responsibilities: '',
                achievements: ''
              }])}
            >
              + Add Experience
            </button>
          </div>
          <div className="profile-card-body">
            {workExperiences.map((exp, index) => (
              <div key={index} className="nested-form-section">
                <div className="nested-form-header">
                  <h3>Experience {index + 1}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setWorkExperiences(workExperiences.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <div className="profile-grid">
                  <div className="form-group">
                    <label>Job Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.job_title || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].job_title = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      placeholder="e.g., Sales Manager"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.company_name || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].company_name = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      placeholder="e.g., Sailing Maritime LLC"
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.location || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].location = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      placeholder="e.g., Dubai, United Arab Emirates"
                    />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.industry || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].industry = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      placeholder="e.g., Logistics, Shipping & Transport"
                    />
                  </div>
                  <div className="form-group">
                    <label>Functional Area</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.functional_area || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].functional_area = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      placeholder="e.g., Freight Forwarding / Air / Sea / Land"
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={exp.start_date || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].start_date = e.target.value;
                        setWorkExperiences(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={exp.end_date || ''}
                      onChange={(e) => {
                        const updated = [...workExperiences];
                        updated[index].end_date = e.target.value;
                        setWorkExperiences(updated);
                      }}
                      disabled={exp.is_current}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={exp.is_current || false}
                        onChange={(e) => {
                          const updated = [...workExperiences];
                          updated[index].is_current = e.target.checked;
                          if (e.target.checked) updated[index].end_date = '';
                          setWorkExperiences(updated);
                        }}
                      />
                      Currently Working Here
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Responsibilities</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={exp.responsibilities || ''}
                    onChange={(e) => {
                      const updated = [...workExperiences];
                      updated[index].responsibilities = e.target.value;
                      setWorkExperiences(updated);
                    }}
                    placeholder="Describe your key responsibilities..."
                  />
                </div>
                <div className="form-group">
                  <label>Achievements</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={exp.achievements || ''}
                    onChange={(e) => {
                      const updated = [...workExperiences];
                      updated[index].achievements = e.target.value;
                      setWorkExperiences(updated);
                    }}
                    placeholder="List your key achievements (one per line)..."
                  />
                </div>
              </div>
            ))}
            {workExperiences.length === 0 && (
              <p className="text-muted">No work experience added yet. Click "Add Experience" to begin.</p>
            )}
          </div>
        </div>

        {/* Education and Professional Certifications */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Education and Professional Certifications</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEducationEntries([...educationEntries, {
                education_level: '',
                course: '',
                specialization: '',
                university: '',
                country: '',
                start_date: '',
                end_date: '',
                year: ''
              }])}
            >
              + Add Education
            </button>
          </div>
          <div className="profile-card-body">
            {educationEntries.map((edu, index) => (
              <div key={index} className="nested-form-section">
                <div className="nested-form-header">
                  <h3>Education {index + 1}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setEducationEntries(educationEntries.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <div className="profile-grid">
                  <div className="form-group">
                    <label>Education Level</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.education_level || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].education_level = e.target.value;
                        setEducationEntries(updated);
                      }}
                      placeholder="e.g., Bachelor, Diploma"
                    />
                  </div>
                  <div className="form-group">
                    <label>Course</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.course || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].course = e.target.value;
                        setEducationEntries(updated);
                      }}
                      placeholder="e.g., Bachelor of Commerce"
                    />
                  </div>
                  <div className="form-group">
                    <label>Specialization</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.specialization || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].specialization = e.target.value;
                        setEducationEntries(updated);
                      }}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="form-group">
                    <label>University</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.university || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].university = e.target.value;
                        setEducationEntries(updated);
                      }}
                      placeholder="e.g., The Cochin College"
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.country || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].country = e.target.value;
                        setEducationEntries(updated);
                      }}
                      placeholder="e.g., India"
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      type="number"
                      className="form-input"
                      value={edu.year || ''}
                      onChange={(e) => {
                        const updated = [...educationEntries];
                        updated[index].year = e.target.value ? parseInt(e.target.value) : '';
                        setEducationEntries(updated);
                      }}
                      placeholder="e.g., 2014"
                    />
                  </div>
                </div>
              </div>
            ))}
            {educationEntries.length === 0 && (
              <p className="text-muted">No education added yet. Click "Add Education" to begin.</p>
            )}
          </div>
        </div>

        {/* Major Achievements & Projects */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Major Achievements & Projects</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMajorProjects([...majorProjects, {
                title: '',
                description: '',
                role: '',
                start_date: '',
                end_date: ''
              }])}
            >
              + Add Project
            </button>
          </div>
          <div className="profile-card-body">
            {majorProjects.map((proj, index) => (
              <div key={index} className="nested-form-section">
                <div className="nested-form-header">
                  <h3>Project {index + 1}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setMajorProjects(majorProjects.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <div className="profile-grid">
                  <div className="form-group">
                    <label>Project Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.title || ''}
                      onChange={(e) => {
                        const updated = [...majorProjects];
                        updated[index].title = e.target.value;
                        setMajorProjects(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Your Role</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.role || ''}
                      onChange={(e) => {
                        const updated = [...majorProjects];
                        updated[index].role = e.target.value;
                        setMajorProjects(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={proj.start_date || ''}
                      onChange={(e) => {
                        const updated = [...majorProjects];
                        updated[index].start_date = e.target.value;
                        setMajorProjects(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={proj.end_date || ''}
                      onChange={(e) => {
                        const updated = [...majorProjects];
                        updated[index].end_date = e.target.value;
                        setMajorProjects(updated);
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={proj.description || ''}
                    onChange={(e) => {
                      const updated = [...majorProjects];
                      updated[index].description = e.target.value;
                      setMajorProjects(updated);
                    }}
                  />
                </div>
              </div>
            ))}
            {majorProjects.length === 0 && (
              <p className="text-muted">No projects added yet. Click "Add Project" to begin.</p>
            )}
          </div>
        </div>

        {/* Honors & Awards */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Honors & Awards</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setHonorsAwards([...honorsAwards, {
                title: '',
                issuer: '',
                date_issued: ''
              }])}
            >
              + Add Award
            </button>
          </div>
          <div className="profile-card-body">
            {honorsAwards.map((award, index) => (
              <div key={index} className="nested-form-section">
                <div className="nested-form-header">
                  <h3>Award {index + 1}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setHonorsAwards(honorsAwards.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <div className="profile-grid">
                  <div className="form-group">
                    <label>Award Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={award.title || ''}
                      onChange={(e) => {
                        const updated = [...honorsAwards];
                        updated[index].title = e.target.value;
                        setHonorsAwards(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Issuing Organization</label>
                    <input
                      type="text"
                      className="form-input"
                      value={award.issuer || ''}
                      onChange={(e) => {
                        const updated = [...honorsAwards];
                        updated[index].issuer = e.target.value;
                        setHonorsAwards(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date Issued</label>
                    <input
                      type="date"
                      className="form-input"
                      value={award.date_issued || ''}
                      onChange={(e) => {
                        const updated = [...honorsAwards];
                        updated[index].date_issued = e.target.value;
                        setHonorsAwards(updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {honorsAwards.length === 0 && (
              <p className="text-muted">No awards added yet. Click "Add Award" to begin.</p>
            )}
          </div>
        </div>

        {/* IT Skills and Certifications */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>IT Skills and Certifications</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setItSkills([...itSkills, {
                skill_name: '',
                version: '',
                last_used: '',
                certification_name: '',
                issuing_organization: '',
                issue_date: '',
                expiry_date: ''
              }])}
            >
              + Add IT Skill/Certification
            </button>
          </div>
          <div className="profile-card-body">
            {itSkills.map((skill, index) => (
              <div key={index} className="nested-form-section">
                <div className="nested-form-header">
                  <h3>IT Skill/Certification {index + 1}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setItSkills(itSkills.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <div className="profile-grid">
                  <div className="form-group">
                    <label>Skill Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={skill.skill_name || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].skill_name = e.target.value;
                        setItSkills(updated);
                      }}
                      placeholder="e.g., Python, SAP, Excel"
                    />
                  </div>
                  <div className="form-group">
                    <label>Version (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={skill.version || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].version = e.target.value;
                        setItSkills(updated);
                      }}
                      placeholder="e.g., 3.11"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Used Year (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={skill.last_used || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].last_used = e.target.value ? parseInt(e.target.value) : '';
                        setItSkills(updated);
                      }}
                      placeholder="e.g., 2024"
                    />
                  </div>
                  <div className="form-group">
                    <label>Certification Name (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={skill.certification_name || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].certification_name = e.target.value;
                        setItSkills(updated);
                      }}
                      placeholder="e.g., AWS Certified Developer"
                    />
                  </div>
                  <div className="form-group">
                    <label>Issuing Organization (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={skill.issuing_organization || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].issuing_organization = e.target.value;
                        setItSkills(updated);
                      }}
                      placeholder="e.g., Amazon Web Services"
                    />
                  </div>
                  <div className="form-group">
                    <label>Issue Date (Optional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={skill.issue_date || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].issue_date = e.target.value;
                        setItSkills(updated);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date (Optional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={skill.expiry_date || ''}
                      onChange={(e) => {
                        const updated = [...itSkills];
                        updated[index].expiry_date = e.target.value;
                        setItSkills(updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {itSkills.length === 0 && (
              <p className="text-muted">No IT skills or certifications added yet. Click "Add IT Skill/Certification" to begin.</p>
            )}
          </div>
        </div>

        {/* Salary Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Salary Information</h2>
          </div>
          <div className="profile-card-body">
            <div className="profile-grid">
              <div className="form-group">
                <label>Current Salary (AED)</label>
                <input
                  type="number"
                  name="current_salary"
                  className="form-input"
                  value={formData.current_salary || ''}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 15000"
                />
              </div>
              <div className="form-group">
                <label>Expected Salary (AED)</label>
                <input
                  type="number"
                  name="desired_monthly_salary"
                  className="form-input"
                  value={formData.desired_monthly_salary || ''}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 20000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Skills</h2>
          </div>
          <div className="profile-card-body">
            <div className="form-group">
              <label>Professional Skills (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.professional_skills?.join(', ') || ''}
                onChange={(e) => handleSkillsChange('professional_skills', e.target.value)}
                placeholder="e.g., Project Management, Leadership, Communication"
              />
            </div>
            <div className="form-group">
              <label>Functional Skills (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.functional_skills?.join(', ') || ''}
                onChange={(e) => handleSkillsChange('functional_skills', e.target.value)}
                placeholder="e.g., Financial Analysis, Marketing, Sales"
              />
            </div>
            <div className="form-group">
              <label>IT Skills (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.it_skills?.join(', ') || ''}
                onChange={(e) => handleSkillsChange('it_skills', e.target.value)}
                placeholder="e.g., Excel, SAP, Python"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving...' : (isNewProfile ? 'Create Profile' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MyProfile;

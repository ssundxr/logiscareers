"""
ML Engine Integration Service for AI Assessments.
Connects Django backend to the enterprise ML scoring engine.

Enhanced with comprehensive field-by-field assessment and CV analysis.
Author: Senior SDE/ML Architect
Date: January 4, 2026
"""

import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add ML engine to path
ML_ENGINE_PATH = Path(__file__).resolve().parent.parent.parent.parent / 'logis_ai_candidate_engine'
sys.path.insert(0, str(ML_ENGINE_PATH.parent))

logger = logging.getLogger(__name__)


class MLEngineService:
    """
    Service class for interacting with the ML scoring engine.
    
    Features:
    - Comprehensive field-by-field assessment
    - Per-field scoring with explanations
    - CV/Resume content analysis
    - Semantic skill matching
    - Real-time job-candidate matching
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialize_engine()
            MLEngineService._initialized = True
    
    def _initialize_engine(self):
        """Initialize ML engine components."""
        try:
            # Import ML engine components
            from logis_ai_candidate_engine.core.scoring.skills_scorer import SkillsScorer
            from logis_ai_candidate_engine.core.scoring.experience_scorer import ExperienceScorer
            from logis_ai_candidate_engine.core.scoring.education_scorer import EducationScorer
            from logis_ai_candidate_engine.core.scoring.salary_scorer import SalaryScorer
            from logis_ai_candidate_engine.core.scoring.domain_scorer import DomainScorer
            from logis_ai_candidate_engine.core.scoring.comprehensive_scorer import ComprehensiveScorer
            from logis_ai_candidate_engine.core.aggregation.weighted_score_aggregator import WeightedScoreAggregator
            from logis_ai_candidate_engine.core.rules.hard_rejection_engine import HardRejectionEngine
            from logis_ai_candidate_engine.core.scoring.contextual_adjuster import ContextualAdjuster
            from logis_ai_candidate_engine.core.scoring.confidence_calculator import ConfidenceCalculator
            from logis_ai_candidate_engine.core.scoring.advanced_scorer import (
                SmartWeightOptimizer, 
                FeatureInteractionDetector
            )
            from logis_ai_candidate_engine.core.enhancement.candidate_intelligence import (
                CandidateInsightGenerator,
                RedFlagDetector
            )
            from logis_ai_candidate_engine.core.rules.data_completeness_validator import DataCompletenessValidator
            from logis_ai_candidate_engine.core.schemas.job import Job
            from logis_ai_candidate_engine.core.schemas.candidate import Candidate
            from logis_ai_candidate_engine.core.scoring.growth_potential_analyzer import GrowthPotentialAnalyzer
            from logis_ai_candidate_engine.core.scoring.smart_recommendation_engine import SmartRecommendationEngine
            
            # Store schema classes for later use
            self.Job = Job
            self.Candidate = Candidate
            self.data_validator = DataCompletenessValidator()
            
            # Initialize scorers
            self.skills_scorer = SkillsScorer()
            self.experience_scorer = ExperienceScorer()
            self.education_scorer = EducationScorer()
            self.salary_scorer = SalaryScorer()
            self.domain_scorer = DomainScorer()
            self.comprehensive_scorer = ComprehensiveScorer()  # New comprehensive scorer
            self.aggregator = WeightedScoreAggregator()
            self.rejection_engine = HardRejectionEngine()
            
            # Phase 4 components
            self.contextual_adjuster = ContextualAdjuster()
            self.confidence_calculator = ConfidenceCalculator()
            self.weight_optimizer = SmartWeightOptimizer()
            self.interaction_detector = FeatureInteractionDetector()
            
            # Enhancement components - Advanced candidate intelligence
            self.insight_generator = CandidateInsightGenerator()
            self.red_flag_detector = RedFlagDetector()
            
            # NEW: Growth potential and smart recommendations
            self.growth_analyzer = GrowthPotentialAnalyzer()
            self.recommendation_engine = SmartRecommendationEngine()
            
            self._engine_available = True
            logger.info("ML Engine initialized successfully with comprehensive scorer and enhanced intelligence")
            
        except ImportError as e:
            logger.warning(f"ML Engine not available: {e}")
            self._engine_available = False
            self.comprehensive_scorer = None
    
    @property
    def is_available(self) -> bool:
        return self._engine_available
    
    def evaluate_candidate(
        self,
        candidate_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate a candidate against job requirements with comprehensive field-by-field assessment.
        Returns detailed assessment with per-field scores and explanations.
        Always runs full assessment even for rejected candidates.
        """
        if not self._engine_available:
            return self._mock_evaluation(candidate_data, job_data)
        
        try:
            # ============================================
            # STEP 1: DATA COMPLETENESS VALIDATION
            # ============================================
            is_candidate_valid, cand_critical, cand_important, cand_score = \
                self.data_validator.validate_candidate_data(candidate_data)
            
            is_job_valid, job_critical, job_important, job_score = \
                self.data_validator.validate_job_data(job_data)
            
            # DEBUG: Print candidate data keys for troubleshooting
            logger.info(f"=== CANDIDATE DATA VALIDATION DEBUG ===")
            logger.info(f"Candidate ID: {candidate_data.get('candidate_id', 'Unknown')}")
            logger.info(f"Candidate Name: {candidate_data.get('full_name', 'Unknown')}")
            logger.info(f"Available data keys: {list(candidate_data.keys())}")
            logger.info(f"email: {candidate_data.get('email')}")
            logger.info(f"mobile_number: {candidate_data.get('mobile_number')}")
            logger.info(f"current_city: {candidate_data.get('current_city')}")
            logger.info(f"total_experience_years: {candidate_data.get('total_experience_years')}")
            logger.info(f"employment_history (count): {len(candidate_data.get('employment_history', []))}")
            logger.info(f"skills (count): {len(candidate_data.get('skills', []))}")
            logger.info(f"skills list: {candidate_data.get('skills', [])}")
            logger.info(f"education_details (count): {len(candidate_data.get('education_details', []))}")
            logger.info(f"expected_salary: {candidate_data.get('expected_salary')}")
            logger.info(f"cv_text (length): {len(candidate_data.get('cv_text', ''))}")
            logger.info(f"Validation Result - Valid: {is_candidate_valid}")
            logger.info(f"Critical Missing ({len(cand_critical)}): {cand_critical}")
            logger.info(f"Important Missing ({len(cand_important)}): {cand_important}")
            logger.info(f"Completeness Score: {cand_score:.1f}%")
            logger.info(f"=====================================")
            
            # Hard reject if critical data is missing
            if not is_candidate_valid or not is_job_valid:
                missing_fields = []
                if cand_critical:
                    missing_fields.extend([f"CANDIDATE: {m}" for m in cand_critical])
                if job_critical:
                    missing_fields.extend([f"JOB: {m}" for m in job_critical])
                
                return {
                    'total_score': 0,
                    'raw_score': 0,
                    'is_rejected': True,
                    'rejection_reasons': [
                        f"INSUFFICIENT DATA FOR ASSESSMENT - Missing {len(missing_fields)} critical field(s)"
                    ],
                    'rejection_rule_code': 'DATA_INCOMPLETE',
                    'data_quality': {
                        'candidate_completeness': round(cand_score, 1),
                        'job_completeness': round(job_score, 1),
                        'missing_critical_fields': missing_fields,
                        'missing_important_fields': cand_important + job_important,
                        'status': 'REJECTED - INCOMPLETE DATA',
                        'message': 'Cannot perform accurate AI assessment without critical data fields. Please complete the profile/job posting with all ⭐⭐ marked fields.',
                        'expected_accuracy': '0% - Unreliable assessment'
                    },
                    'section_scores': {},
                    'field_assessments': [],
                    'contextual_adjustments': [],
                    'total_adjustment': 0,
                    'confidence': {'level': 'none', 'score': 0},
                    'weights_used': {},
                    'recommendation': 'NOT ASSESSABLE - Complete required data fields first',
                    'timestamp': datetime.now().isoformat(),
                    'insights': {
                        'strengths': [],
                        'weaknesses': ['Incomplete profile - missing critical data for accurate assessment'],
                        'red_flags': [{
                            'type': 'missing_data',
                            'severity': 'CRITICAL',
                            'description': f'Profile missing {len(cand_critical)} critical data fields',
                            'impact': 'Cannot perform reliable AI assessment',
                            'recommendation': 'Complete all ⭐⭐ marked mandatory fields before assessment'
                        }] if cand_critical else [],
                        'career_progression': 'unclear',
                        'skill_currency_score': 0,
                        'learning_potential': 0,
                        'cultural_fit_score': 0,
                        'recommendation': 'Complete profile with all required data before assessment',
                        'key_highlights': []
                    }
                }
            
            # Log data quality warnings for important missing fields
            if cand_important or job_important:
                logger.warning(
                    f"Assessment proceeding with reduced accuracy. "
                    f"Missing {len(cand_important) + len(job_important)} important fields. "
                    f"Expected accuracy: {((cand_score + job_score) / 2):.1f}%"
                )
            
            # ============================================
            # STEP 2: PROCEED WITH NORMAL ASSESSMENT
            # ============================================
            # Convert dicts to Pydantic models for hard rejection engine
            job = self.Job(**job_data)
            candidate = self.Candidate(**candidate_data)
            
            # Check hard rejections first
            rejection_result = self.rejection_engine.evaluate(job=job, candidate=candidate)
            is_hard_rejected = not rejection_result.is_eligible
            hard_rejection_reasons = [rejection_result.rejection_reason] if rejection_result.rejection_reason else []
            hard_rejection_code = rejection_result.rejection_rule_code if is_hard_rejected else None
            
            # Always run comprehensive field-by-field assessment (even for rejected candidates)
            # This provides detailed feedback on why the candidate was rejected
            cv_text = candidate_data.get('cv_text', '')
            comprehensive_result = self.comprehensive_scorer.assess(
                candidate_data=candidate_data,
                job_data=job_data,
                cv_text=cv_text
            )
            
            # Get smart weights based on job level
            try:
                weights, job_level_name = self.weight_optimizer.get_optimized_weights(job)
                designation = job_level_name
            except Exception:
                weights = {'skills': 0.35, 'experience': 0.25, 'education': 0.15, 'salary': 0.15, 'domain': 0.10}
                designation = job_data.get('designation', 'mid')
            
            # Build enhanced section scores from comprehensive assessment
            section_scores = {}
            field_assessments = []
            
            for section in comprehensive_result.sections:
                section_scores[section.section_name] = {
                    'score': section.total_score,
                    'weight': section.weight,
                    'match_level': section.match_level.value,
                    'explanation': section.explanation,
                    'details': {
                        'fields': [f.to_dict() for f in section.fields]
                    }
                }
                
                # Flatten field assessments for easy frontend consumption
                for field in section.fields:
                    field_assessments.append({
                        'section': section.section_label,
                        'field': field.field_label,
                        'candidate_value': field.candidate_value,
                        'job_requirement': field.job_requirement,
                        'score': field.score,
                        'explanation': field.explanation,
                        'match_level': field.match_level.value
                    })
            
            # Include CV assessment if available
            cv_assessment_data = None
            if comprehensive_result.cv_assessment:
                cv_assessment_data = comprehensive_result.cv_assessment.to_dict()
            
            # Apply contextual adjustments
            contextual_adjustments = []
            total_adjustment = 0
            
            # Example contextual adjustments based on scoring patterns
            if comprehensive_result.total_score >= 80:
                if section_scores.get('skills', {}).get('score', 0) >= 90:
                    contextual_adjustments.append({
                        'rule': 'Strong skills match bonus',
                        'points': 3,
                        'reason': 'Excellent technical skills alignment'
                    })
                    total_adjustment += 3
            
            if section_scores.get('experience', {}).get('score', 0) >= 85:
                contextual_adjustments.append({
                    'rule': 'Industry experience bonus',
                    'points': 2,
                    'reason': 'Strong industry-specific experience'
                })
                total_adjustment += 2
            
            if cv_assessment_data and cv_assessment_data.get('cv_score', 0) >= 80:
                contextual_adjustments.append({
                    'rule': 'CV quality bonus',
                    'points': 2,
                    'reason': 'Well-structured CV with relevant keywords'
                })
                total_adjustment += 2
            
            # Calculate final adjusted score (0 if hard rejected)
            if is_hard_rejected:
                adjusted_score = 0
                recommendation = 'NOT RECOMMENDED - Hard rejection criteria met'
                all_rejection_reasons = hard_rejection_reasons + (comprehensive_result.rejection_reasons or [])
            else:
                adjusted_score = min(100, max(0, comprehensive_result.total_score + total_adjustment))
                recommendation = comprehensive_result.recommendation
                all_rejection_reasons = comprehensive_result.rejection_reasons or []
            
            # Generate enhanced candidate insights (red flags, strengths, weaknesses)
            assessment_data = {
                'total_score': adjusted_score,
                'is_rejected': is_hard_rejected or comprehensive_result.is_rejected,
                'section_scores': section_scores
            }
            
            try:
                candidate_insights = self.insight_generator.generate_insights(
                    candidate_data, job_data, assessment_data
                )
                
                # Convert insights to dict format
                insights_dict = {
                    'strengths': candidate_insights.strengths,
                    'weaknesses': candidate_insights.weaknesses,
                    'red_flags': [
                        {
                            'type': flag.flag_type,
                            'severity': flag.severity.value,
                            'description': flag.description,
                            'impact': flag.impact,
                            'recommendation': flag.recommendation
                        }
                        for flag in candidate_insights.red_flags
                    ],
                    'career_progression': candidate_insights.career_progression.value,
                    'skill_currency_score': round(candidate_insights.skill_currency_score, 1),
                    'learning_potential': round(candidate_insights.learning_potential, 1),
                    'cultural_fit_score': round(candidate_insights.cultural_fit_score, 1),
                    'recommendation': candidate_insights.recommendation,
                    'key_highlights': candidate_insights.key_highlights
                }
            except Exception as e:
                logger.warning(f"Error generating candidate insights: {e}")
                insights_dict = {
                    'strengths': [],
                    'weaknesses': [],
                    'red_flags': [],
                    'career_progression': 'unclear',
                    'skill_currency_score': 50.0,
                    'learning_potential': 50.0,
                    'cultural_fit_score': 50.0,
                    'recommendation': recommendation,
                    'key_highlights': []
                }
            
            # Calculate assessment quality based on data completeness
            assessment_quality = self.data_validator._estimate_assessment_quality(
                cand_score, job_score, len(cand_critical), len(job_critical)
            )
            
            # ============================================
            # STEP 3: GROWTH POTENTIAL ANALYSIS (NEW)
            # ============================================
            try:
                growth_potential = self.growth_analyzer.analyze(
                    candidate_data=candidate_data,
                    job_data=job_data,
                    current_assessment_score=adjusted_score
                )
                
                growth_data = {
                    'growth_potential_score': growth_potential.growth_potential_score,
                    'learning_agility': growth_potential.learning_agility,
                    'career_trajectory_score': growth_potential.career_trajectory_score,
                    'skill_acquisition_rate': growth_potential.skill_acquisition_rate,
                    'adaptability_score': growth_potential.adaptability_score,
                    'tier': growth_potential.tier,
                    'indicators': growth_potential.indicators,
                    'recommendation': growth_potential.recommendation,
                    'key_factors': growth_potential.key_factors
                }
                
                logger.info(f"Growth Potential Analysis: {growth_potential.growth_potential_score:.1f}/100 - {growth_potential.tier}")
            except Exception as e:
                logger.warning(f"Error calculating growth potential: {e}")
                growth_data = {
                    'growth_potential_score': 50.0,
                    'learning_agility': 50.0,
                    'career_trajectory_score': 50.0,
                    'skill_acquisition_rate': 50.0,
                    'adaptability_score': 50.0,
                    'tier': 'not_assessed',
                    'indicators': [],
                    'recommendation': 'Growth potential not assessed due to insufficient data',
                    'key_factors': {}
                }
            
            # ============================================
            # STEP 4: SMART RECOMMENDATION (NEW)
            # ============================================
            try:
                current_assessment = {
                    'total_score': adjusted_score,
                    'confidence': {
                        'level': self._get_confidence_level(comprehensive_result.confidence_score),
                        'score': comprehensive_result.confidence_score
                    },
                    'is_rejected': is_hard_rejected or comprehensive_result.is_rejected,
                    'insights': insights_dict
                }
                
                smart_rec = self.recommendation_engine.generate_recommendation(
                    assessment_data=current_assessment,
                    growth_potential_score=growth_data['growth_potential_score'],
                    candidate_data=candidate_data,
                    job_data=job_data
                )
                
                smart_recommendation = {
                    'action': smart_rec.action.value,
                    'priority': smart_rec.priority.value,
                    'message': smart_rec.message,
                    'confidence_interval': {
                        'point_estimate': smart_rec.confidence_interval.point_estimate,
                        'lower_bound': smart_rec.confidence_interval.lower_bound,
                        'upper_bound': smart_rec.confidence_interval.upper_bound,
                        'margin_of_error': smart_rec.confidence_interval.margin_of_error,
                        'confidence_level': smart_rec.confidence_interval.confidence_level,
                        'display': f"{smart_rec.confidence_interval.point_estimate:.0f} ± {smart_rec.confidence_interval.margin_of_error:.0f} ({smart_rec.confidence_interval.confidence_level}% confidence)"
                    },
                    'risk_level': smart_rec.risk_level,
                    'next_steps': smart_rec.next_steps,
                    'estimated_success_probability': smart_rec.estimated_success_probability,
                    'interview_questions_focus': smart_rec.interview_questions_focus,
                    'decision_factors': smart_rec.decision_factors
                }
                
                logger.info(f"Smart Recommendation: {smart_rec.action.value} - {smart_rec.priority.value} priority")
            except Exception as e:
                logger.warning(f"Error generating smart recommendation: {e}")
                smart_recommendation = {
                    'action': 'shortlist',
                    'priority': 'medium',
                    'message': recommendation,
                    'confidence_interval': {
                        'point_estimate': adjusted_score,
                        'lower_bound': max(0, adjusted_score - 5),
                        'upper_bound': min(100, adjusted_score + 5),
                        'margin_of_error': 5,
                        'confidence_level': 90,
                        'display': f"{adjusted_score:.0f} ± 5 (90% confidence)"
                    },
                    'risk_level': 'medium',
                    'next_steps': ['Review assessment details'],
                    'estimated_success_probability': adjusted_score,
                    'interview_questions_focus': [],
                    'decision_factors': {}
                }
            
            return {
                'total_score': round(adjusted_score, 1),
                'raw_score': comprehensive_result.total_score,
                'is_rejected': is_hard_rejected or comprehensive_result.is_rejected,
                'rejection_reasons': all_rejection_reasons,
                'rejection_rule_code': hard_rejection_code,
                'data_quality': {
                    'candidate_completeness': round(cand_score, 1),
                    'job_completeness': round(job_score, 1),
                    'missing_important_fields': cand_important + job_important,
                    'assessment_quality': assessment_quality['quality'],
                    'expected_accuracy': assessment_quality['accuracy'],
                    'confidence_level': assessment_quality['confidence'],
                    'message': assessment_quality['message']
                },
                'section_scores': section_scores,
                'field_assessments': field_assessments,
                'cv_assessment': cv_assessment_data,
                'contextual_adjustments': contextual_adjustments,
                'total_adjustment': total_adjustment,
                'feature_interactions': [],
                'confidence': {
                    'level': self._get_confidence_level(comprehensive_result.confidence_score),
                    'score': comprehensive_result.confidence_score
                },
                'weights_used': weights,
                'job_level': designation,
                'recommendation': recommendation,
                'overall_explanation': comprehensive_result.overall_explanation,
                'rule_trace': rejection_result.rule_trace,
                'timestamp': comprehensive_result.timestamp,
                'insights': insights_dict,
                'growth_potential': growth_data,  # NEW
                'smart_recommendation': smart_recommendation,  # NEW
            }
            
        except Exception as e:
            logger.error(f"ML Engine evaluation error: {e}", exc_info=True)
            return self._mock_evaluation(candidate_data, job_data)
    
    def _get_confidence_level(self, score: float) -> str:
        """Convert confidence score to level string."""
        if score >= 0.8:
            return 'high'
        elif score >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    def _mock_evaluation(
        self,
        candidate_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fallback mock evaluation when ML engine is unavailable.
        Provides realistic mock data for testing purposes.
        """
        import random
        
        base_score = random.uniform(55, 85)
        
        # Generate mock field assessments
        mock_fields = [
            {'section': 'Personal Details', 'field': 'Nationality', 'score': random.randint(70, 100), 'explanation': 'Nationality assessment'},
            {'section': 'Personal Details', 'field': 'Location', 'score': random.randint(60, 100), 'explanation': 'Location match assessment'},
            {'section': 'Personal Details', 'field': 'Availability', 'score': random.randint(70, 100), 'explanation': 'Availability assessment'},
            {'section': 'Experience', 'field': 'Total Experience', 'score': random.randint(50, 95), 'explanation': 'Experience years match'},
            {'section': 'Experience', 'field': 'Industry', 'score': random.randint(60, 90), 'explanation': 'Industry alignment'},
            {'section': 'Education', 'field': 'Education Level', 'score': random.randint(70, 100), 'explanation': 'Education qualification match'},
            {'section': 'Skills', 'field': 'Required Skills', 'score': random.randint(40, 90), 'explanation': 'Skills match assessment'},
            {'section': 'Skills', 'field': 'Preferred Skills', 'score': random.randint(50, 100), 'explanation': 'Preferred skills match'},
            {'section': 'Salary', 'field': 'Expected Salary', 'score': random.randint(50, 100), 'explanation': 'Salary alignment'},
        ]
        
        for field in mock_fields:
            field['candidate_value'] = 'Mock value'
            field['job_requirement'] = 'Mock requirement'
            field['match_level'] = 'good' if field['score'] >= 70 else 'partial'
        
        return {
            'total_score': round(base_score, 1),
            'raw_score': round(base_score, 1),
            'is_rejected': False,
            'rejection_reasons': [],
            'section_scores': {
                'personal_details': {
                    'score': random.randint(70, 95),
                    'weight': 0.10,
                    'match_level': 'good',
                    'explanation': 'Personal details assessment (mock)',
                    'details': {'fields': []}
                },
                'experience': {
                    'score': random.randint(50, 90),
                    'weight': 0.25,
                    'match_level': 'good',
                    'explanation': 'Experience assessment (mock)',
                    'details': {'fields': []}
                },
                'education': {
                    'score': random.randint(70, 95),
                    'weight': 0.15,
                    'match_level': 'good',
                    'explanation': 'Education assessment (mock)',
                    'details': {'fields': []}
                },
                'skills': {
                    'score': random.randint(40, 85),
                    'weight': 0.25,
                    'match_level': 'partial',
                    'explanation': 'Skills assessment (mock)',
                    'details': {'fields': []}
                },
                'salary': {
                    'score': random.randint(60, 100),
                    'weight': 0.10,
                    'match_level': 'good',
                    'explanation': 'Salary assessment (mock)',
                    'details': {'fields': []}
                },
                'cv_analysis': {
                    'score': random.randint(50, 80),
                    'weight': 0.15,
                    'match_level': 'partial',
                    'explanation': 'CV analysis (mock)',
                    'details': {'fields': []}
                },
            },
            'field_assessments': mock_fields,
            'cv_assessment': {
                'cv_score': random.randint(55, 80),
                'cv_quality_score': random.randint(60, 85),
                'content_relevance_score': random.randint(50, 85),
                'keyword_match_score': random.randint(40, 80),
                'experience_extraction_score': random.randint(60, 90),
                'skills_extraction_score': random.randint(55, 85),
                'explanation': 'Mock CV analysis - engine not available',
                'matched_keywords': ['logistics', 'supply chain', 'management'],
                'missing_keywords': ['specific skill 1', 'specific skill 2'],
                'cv_insights': {'mock': True}
            },
            'contextual_adjustments': [],
            'total_adjustment': 0,
            'feature_interactions': [],
            'confidence': {
                'level': 'medium',
                'score': 0.7,
            },
            'weights_used': {
                'personal_details': 0.10,
                'experience': 0.25,
                'education': 0.15,
                'skills': 0.25,
                'salary': 0.10,
                'cv_analysis': 0.15,
            },
            'job_level': 'mid',
            'recommendation': 'CONSIDER - Review specific gaps before proceeding (mock)',
            'overall_explanation': 'This is a mock evaluation - ML engine not available.',
            'timestamp': datetime.now().isoformat(),
            '_mock': True,
        }


# Singleton instance
ml_engine = MLEngineService()

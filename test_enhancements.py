"""
Test script for new ML engine enhancements:
1. Growth Potential Analysis
2. Smart Recommendations
3. Confidence Intervals

Run this to demonstrate the new features without needing authentication.
"""

import sys
from pathlib import Path

# Add ML engine to path
ML_ENGINE_PATH = Path(__file__).resolve().parent / 'logis_ai_candidate_engine'
sys.path.insert(0, str(ML_ENGINE_PATH.parent))

from logis_ai_candidate_engine.core.scoring.growth_potential_analyzer import GrowthPotentialAnalyzer
from logis_ai_candidate_engine.core.scoring.smart_recommendation_engine import SmartRecommendationEngine


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def test_growth_potential():
    """Test Growth Potential Analyzer"""
    print_section("TEST 1: Growth Potential Analysis")
    
    # Sample candidate data
    candidate_data = {
        'name': 'John Doe',
        'skills': ['Python', 'Machine Learning', 'TensorFlow', 'Docker', 'Kubernetes'],
        'experience': [
            {
                'title': 'Junior Developer',
                'company': 'TechCorp',
                'duration_months': 12,
                'end_date': '2022-12-31'
            },
            {
                'title': 'ML Engineer',
                'company': 'AI Solutions',
                'duration_months': 18,
                'end_date': '2024-06-30'
            },
            {
                'title': 'Senior ML Engineer',
                'company': 'DataTech',
                'duration_months': 8,
                'end_date': '2026-01-01'  # Recent
            }
        ],
        'education': [
            {
                'degree': 'BS Computer Science',
                'institution': 'State University',
                'graduation_year': 2021
            },
            {
                'degree': 'MS Artificial Intelligence',
                'institution': 'Tech Institute',
                'graduation_year': 2023
            }
        ],
        'certifications': [
            {
                'name': 'AWS Certified Machine Learning',
                'issuer': 'Amazon',
                'date_obtained': '2025-08-15'  # Recent
            },
            {
                'name': 'TensorFlow Developer Certificate',
                'issuer': 'Google',
                'date_obtained': '2025-11-20'  # Very recent
            }
        ],
        'languages': ['English', 'Spanish']
    }
    
    job_data = {
        'title': 'Senior ML Engineer',
        'required_skills': ['Python', 'Machine Learning', 'TensorFlow', 'AWS'],
        'industry': 'Technology'
    }
    
    current_score = 78  # Moderate fit score
    
    # Analyze growth potential
    analyzer = GrowthPotentialAnalyzer()
    result = analyzer.analyze(candidate_data, job_data, current_score)
    
    print(f"Current Fit Score: {current_score}%")
    print(f"Growth Potential Score: {result.growth_potential_score:.1f}%")
    print(f"Tier: {result.tier.upper()}")
    print(f"\nBreakdown:")
    print(f"  - Learning Agility: {result.learning_agility:.1f}%")
    print(f"  - Career Trajectory: {result.career_trajectory_score:.1f}%")
    print(f"  - Skill Acquisition Rate: {result.skill_acquisition_rate:.1f}%")
    print(f"  - Adaptability: {result.adaptability_score:.1f}%")
    print(f"\nKey Indicators:")
    for indicator in result.indicators:
        print(f"  ✓ {indicator}")
    print(f"\nRecommendation: {result.recommendation}")
    
    return result


def test_smart_recommendations(growth_potential_score=85.0):
    """Test Smart Recommendation Engine"""
    print_section("TEST 2: Smart Recommendations with Confidence Intervals")
    
    # Sample assessment data
    assessment_data = {
        'overall_score': 78,
        'confidence_score': 85,  # High confidence
        'field_assessments': {
            'skills': {'score': 82, 'match_percentage': 82},
            'experience': {'score': 75, 'match_percentage': 75},
            'education': {'score': 80, 'match_percentage': 80},
            'salary': {'score': 70, 'match_percentage': 70}
        },
        'weak_sections': ['salary_expectations', 'specific_domain_knowledge'],
        'strong_sections': ['technical_skills', 'education'],
        'red_flags': [],  # No red flags
        'insights': [
            'Strong technical background in ML/AI',
            'Recent upskilling in cloud technologies',
            'Excellent educational credentials'
        ]
    }
    
    # Generate recommendation
    engine = SmartRecommendationEngine()
    recommendation = engine.generate_recommendation(
        assessment_data=assessment_data,
        growth_potential_score=growth_potential_score
    )
    
    # Display confidence interval
    ci = recommendation.confidence_interval
    print(f"Score: {ci.point_estimate:.1f} ± {ci.margin_of_error:.1f} ({int(ci.confidence_level*100)}% confidence)")
    print(f"Range: {ci.lower_bound:.1f} - {ci.upper_bound:.1f}")
    
    print(f"\n🎯 Hiring Action: {recommendation.action.value}")
    print(f"📊 Priority: {recommendation.priority.value}")
    print(f"⚠️  Risk Level: {recommendation.risk_level.upper()}")
    print(f"📈 Success Probability: {recommendation.estimated_success_probability:.1f}%")
    
    print(f"\n📋 Next Steps:")
    for i, step in enumerate(recommendation.next_steps, 1):
        print(f"  {i}. {step}")
    
    print(f"\n💬 Interview Focus Areas:")
    for area in recommendation.interview_questions_focus:
        print(f"  • {area}")
    
    print(f"\n📊 Decision Factors:")
    for key, value in recommendation.decision_factors.items():
        if isinstance(value, list):
            print(f"  {key}: {', '.join(value)}")
        else:
            print(f"  {key}: {value}")
    
    return recommendation


def test_low_growth_scenario():
    """Test with a candidate who has low growth potential"""
    print_section("TEST 3: Low Growth Potential Scenario")
    
    candidate_data = {
        'name': 'Jane Smith',
        'skills': ['Excel', 'PowerPoint', 'Email'],
        'experience': [
            {
                'title': 'Admin Assistant',
                'company': 'OldCorp',
                'duration_months': 60,
                'end_date': '2025-12-31'
            }
        ],
        'education': [
            {
                'degree': 'High School Diploma',
                'institution': 'Local High School',
                'graduation_year': 2019
            }
        ],
        'certifications': [],
        'languages': ['English']
    }
    
    job_data = {
        'title': 'Senior Software Engineer',
        'required_skills': ['Python', 'Java', 'System Design', 'Microservices'],
        'industry': 'Technology'
    }
    
    current_score = 35  # Low fit score
    
    analyzer = GrowthPotentialAnalyzer()
    result = analyzer.analyze(candidate_data, job_data, current_score)
    
    print(f"Current Fit Score: {current_score}%")
    print(f"Growth Potential Score: {result.growth_potential_score:.1f}%")
    print(f"Tier: {result.tier.upper()}")
    print(f"\nRecommendation: {result.recommendation}")
    
    # Now get smart recommendation with low scores
    assessment_data = {
        'overall_score': 35,
        'confidence_score': 60,
        'field_assessments': {
            'skills': {'score': 20, 'match_percentage': 20},
            'experience': {'score': 40, 'match_percentage': 40},
            'education': {'score': 45, 'match_percentage': 45},
            'salary': {'score': 50, 'match_percentage': 50}
        },
        'weak_sections': ['technical_skills', 'domain_knowledge', 'experience_level'],
        'strong_sections': [],
        'red_flags': ['Significant skill gap', 'No relevant experience'],
        'insights': []
    }
    
    engine = SmartRecommendationEngine()
    recommendation = engine.generate_recommendation(
        assessment_data=assessment_data,
        growth_potential_score=result.growth_potential_score
    )
    
    ci = recommendation.confidence_interval
    print(f"\nScore: {ci.point_estimate:.1f} ± {ci.margin_of_error:.1f} ({int(ci.confidence_level*100)}% confidence)")
    print(f"🎯 Hiring Action: {recommendation.action.value}")
    print(f"📊 Priority: {recommendation.priority.value}")
    print(f"⚠️  Risk Level: {recommendation.risk_level.upper()}")
    
    return result, recommendation


def main():
    """Run all tests"""
    print("\n" + "🚀" * 40)
    print("  ML ENGINE ENHANCEMENTS - DEMO TEST SUITE")
    print("  Enhanced with Growth Potential & Smart Recommendations")
    print("🚀" * 40)
    
    try:
        # Test 1: High potential candidate
        growth_result = test_growth_potential()
        
        # Test 2: Smart recommendations for high potential
        smart_rec = test_smart_recommendations(growth_result.growth_potential_score)
        
        # Test 3: Low potential candidate
        low_growth, low_rec = test_low_growth_scenario()
        
        print_section("SUMMARY")
        print("✅ All tests completed successfully!")
        print("\n📊 Key Features Demonstrated:")
        print("  1. ✓ Growth Potential Analysis - Identifies future potential beyond current fit")
        print("  2. ✓ Confidence Intervals - Statistical rigor with ± margins")
        print("  3. ✓ Smart Recommendations - Actionable hiring decisions with priority levels")
        print("  4. ✓ Risk Assessment - Low/Medium/High risk categorization")
        print("  5. ✓ Interview Focus - Automated question area suggestions")
        print("  6. ✓ Success Probability - Data-driven hire success prediction")
        
        print("\n🎯 Production Ready for Demo!")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

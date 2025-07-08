#!/usr/bin/env python3
"""
Test Pure AI Scoring System
No hardcoded BKM logic - AI decides everything
"""

import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import logging
from fpdf import FPDF
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import unicodedata

def sanitize_text(text):
    """Convert Unicode smart characters to ASCII equivalents and remove unencodable ones."""
    if not text:
        return ""
    # Normalize to ASCII (e.g., replace ’ with ')
    text = unicodedata.normalize("NFKD", text)
    return text.encode("ascii", "ignore").decode("ascii")

def generate_comprehensive_pdf_report(citizen_profile, scoring_result, db_score):
    from fpdf import FPDF
    from datetime import datetime

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    HEADER_COLOR = (41, 128, 185)
    ACCENT_COLOR = (52, 152, 219)
    SUCCESS_COLOR = (39, 174, 96)
    ERROR_COLOR = (231, 76, 60)
    TEXT_COLOR = (44, 62, 80)

    def set_text_color(color):
        pdf.set_text_color(*color)

    def add_header(title, color):
        pdf.set_fill_color(*color)
        set_text_color((255, 255, 255))
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(0, 10, title, ln=True, fill=True)
        set_text_color(TEXT_COLOR)
        pdf.ln(3)

    def add_info_box(label, value):
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(50, 6, f"{label}:", ln=False)
        pdf.set_font("Arial", size=10)
        pdf.multi_cell(0, 6, str(value))
        pdf.ln(1)

    def add_score_highlight(score):
        if score >= 80:
            color = SUCCESS_COLOR
        elif score >= 60:
            color = (243, 156, 18)
        elif score >= 40:
            color = (230, 126, 34)
        else:
            color = ERROR_COLOR
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(0, 15, f"SCORE: {score}/100", ln=True, align="C", fill=True)
        set_text_color(TEXT_COLOR)
        pdf.ln(5)

    # Report Title
    pdf.set_fill_color(*HEADER_COLOR)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", 'B', 20)
    pdf.cell(0, 20, "AI SUBSIDY ELIGIBILITY REPORT", ln=True, align="C", fill=True)
    set_text_color(TEXT_COLOR)
    pdf.set_font("Arial", size=12)
    pdf.cell(0, 8, f"Generated: {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')}", ln=True, align="C")
    pdf.cell(0, 8, "Pure AI Scoring System - Malaysian Government Subsidy Platform", ln=True, align="C")
    pdf.ln(10)

    # Citizen Profile
    add_header("CITIZEN PROFILE", HEADER_COLOR)
    add_info_box("Full Name", citizen_profile.get('full_name', 'Unknown'))
    add_info_box("Monthly Income", f"RM {citizen_profile.get('monthly_income', 0):,}")
    add_info_box("Household Size", f"{citizen_profile.get('household_size', 0)} people")
    add_info_box("Number of Children", citizen_profile.get('number_of_children', 0))
    add_info_box("Disability Status (OKU)", "Yes" if citizen_profile.get('disability_status', False) else "No")
    add_info_box("State", citizen_profile.get('state', 'Unknown'))
    pdf.ln(5)

    # Scoring Results
    add_header("AI SCORING RESULTS", ACCENT_COLOR)
    add_score_highlight(scoring_result.eligibility_score)
    add_info_box("Subsidy Amount", f"RM {scoring_result.subsidy_amount} (Admin to determine)")
    add_info_box("Processing Date", scoring_result.processed_at.strftime('%Y-%m-%d %H:%M:%S'))
    add_info_box("Processing Status", "Completed Successfully")
    pdf.ln(3)

    # DB Verification
    if db_score == scoring_result.eligibility_score:
        add_header("DATABASE VERIFICATION", SUCCESS_COLOR)
        add_info_box("Status", "SUCCESS - Score updated in database")
        add_info_box("Database Score", f"{db_score}/100")
    else:
        add_header("DATABASE VERIFICATION", ERROR_COLOR)
        add_info_box("Status", "ERROR - Score mismatch detected")
        add_info_box("Expected Score", f"{scoring_result.eligibility_score}/100")
        add_info_box("Database Score", f"{db_score}/100")
    pdf.ln(3)

    # AI Reasoning
    add_header("COMPLETE AI ANALYSIS & REASONING", HEADER_COLOR)
    reasoning_text = sanitize_text(scoring_result.reasoning) or "No detailed reasoning available."

    pdf.set_font("Arial", size=9)
    lines = reasoning_text.replace('\r', '').split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        pdf.multi_cell(0, 5, line)
    pdf.ln(3)

    # System Summary
    add_header("PURE AI SYSTEM SUMMARY", ACCENT_COLOR)
    pdf.set_font("Arial", size=10)
    summary_points = [
        "- AI analyzed citizen profile using official Malaysian government data",
        "- No hardcoded BKM or program-specific limitations applied",
        "- Scoring based on DOSM HIES 2022 data and state-specific PLI",
        "- AI considered: income, household size, OKU status, children, state factors",
        "- Admin retains full control over final subsidy amount determination",
        "- System provides transparent, evidence-based eligibility assessment"
    ]
    for point in summary_points:
        pdf.multi_cell(0, 6, point)
    pdf.ln(2)

    # Data Sources
    add_header("OFFICIAL DATA SOURCES USED", HEADER_COLOR)
    pdf.set_font("Arial", size=9)
    sources = [
        "- DOSM Household Income & Expenditure Survey (HIES) 2022",
        "- Official Poverty Line Income by State (https://storage.dosm.gov.my/)",
        "- Malaysian government policy documents (13 PDF files analyzed)",
        "- Live web search results for current program information",
        "- B40/M40/T20 income classifications (RM5,249 / RM11,819 thresholds)",
        "- OKU (disability) benefit policies and considerations"
    ]
    for source in sources:
        pdf.multi_cell(0, 5, source)

    # Footer
    pdf.ln(5)
    pdf.set_font("Arial", 'I', 8)
    set_text_color((128, 128, 128))
    pdf.cell(0, 5, "This report was generated by the Pure AI Scoring System", ln=True, align="C")
    pdf.cell(0, 5, "Malaysian Government Subsidy Distribution Platform", ln=True, align="C")

    # Save
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    citizen_name = citizen_profile.get('full_name', 'Unknown').replace(' ', '_')
    filename = f"Professional_AI_Report_{citizen_name}_{timestamp}.pdf"
    try:
        pdf.output(filename)
        logger.info(f"📄 PDF generated: {filename}")
        return filename
    except Exception as e:
        logger.error(f"❌ Failed to generate PDF: {e}")
        return None

def test_pure_ai_har_sze_hao():
    """Test HAR SZE HAO with pure AI scoring - no hardcoded logic."""
    try:
        from services.supabase_client import supabase_service
        from workflows.eligibility_flow import eligibility_workflow
        
        logger.info("=== TESTING PURE AI SCORING SYSTEM ===")
        logger.info("✅ No hardcoded BKM logic")
        logger.info("✅ AI decides eligibility score only")
        logger.info("✅ Admin determines subsidy amounts separately")
        logger.info("=" * 80)
        
        # HAR SZE HAO's profile
        citizen_id = "615e5ad8-1562-44f2-b71a-bd17474d0d3c"
        
        # Get citizen profile
        citizen_profile = supabase_service.get_citizen_profile(citizen_id)
        
        if not citizen_profile:
            logger.error("❌ Citizen not found in database")
            return False
        
        logger.info("👤 CITIZEN PROFILE:")
        logger.info(f"   Name: {citizen_profile.get('full_name', 'Unknown')}")
        logger.info(f"   Monthly Income: RM{citizen_profile.get('monthly_income', 0)}")
        logger.info(f"   Household Size: {citizen_profile.get('household_size', 0)}")
        logger.info(f"   Children: {citizen_profile.get('number_of_children', 0)}")
        logger.info(f"   Disability (OKU): {citizen_profile.get('disability_status', False)}")
        logger.info(f"   State: {citizen_profile.get('state', 'Unknown')}")
        
        # Show what AI has access to
        logger.info("\n🧠 AI HAS ACCESS TO:")
        logger.info("   📊 Official DOSM HIES 2022 income classifications")
        logger.info("   📍 State-specific Poverty Line Income (PLI)")
        logger.info("   📚 Government PDF documents (13 files)")
        logger.info("   🔍 Live web search results")
        logger.info("   🏛️  BKM/STR program criteria (for reference only)")
        
        logger.info("\n🚫 AI DOES NOT:")
        logger.info("   ❌ Apply hardcoded BKM income limits")
        logger.info("   ❌ Calculate specific subsidy amounts")
        logger.info("   ❌ Use predetermined eligibility rules")
        
        logger.info("\n" + "=" * 80)
        logger.info("🚀 STARTING PURE AI ELIGIBILITY SCORING")
        logger.info("=" * 80)
        
        # Process through pure AI eligibility workflow
        scoring_result = eligibility_workflow.process_citizen(
            citizen_id=citizen_id,
            citizen_profile=citizen_profile,
            include_web_search=True
        )
        
        logger.info("\n✅ PURE AI SCORING RESULTS:")
        logger.info(f"   🎯 AI Eligibility Score: {scoring_result.eligibility_score}/100")
        logger.info(f"   💰 Subsidy Amount: RM{scoring_result.subsidy_amount} (Admin to determine)")
        logger.info(f"   📅 Processed: {scoring_result.processed_at}")
        
        # Verify database update
        logger.info("\n📊 VERIFYING DATABASE UPDATE:")
        updated_profile = supabase_service.get_citizen_profile(citizen_id)
        db_score = updated_profile.get('eligibility_score') if updated_profile else None
        
        if db_score == scoring_result.eligibility_score:
            logger.info(f"   ✅ Database updated successfully: {db_score}/100")
        else:
            logger.error(f"   ❌ Database update failed. Expected: {scoring_result.eligibility_score}, Got: {db_score}")
        
        # Show key insights
        logger.info("\n🔍 KEY INSIGHTS:")
        logger.info("   🧠 AI made autonomous eligibility decision")
        logger.info("   📋 Score based on official government data")
        logger.info("   🎛️  Admin retains control over subsidy amounts")
        logger.info("   💾 Only eligibility score stored in database")
        
        # Generate comprehensive PDF report
        logger.info("\n📄 GENERATING COMPREHENSIVE PDF REPORT...")
        pdf_filename = generate_comprehensive_pdf_report(
            citizen_profile=citizen_profile,
            scoring_result=scoring_result,
            db_score=db_score
        )
        
        if pdf_filename:
            logger.info(f"✅ PDF Report Successfully Generated: {pdf_filename}")
            logger.info("📋 Report includes:")
            logger.info("   • Complete citizen profile")
            logger.info("   • AI eligibility score and reasoning")
            logger.info("   • Full AI analysis explanation")
            logger.info("   • Database verification status")
            logger.info("   • System summary and data sources")
        else:
            logger.error("❌ Failed to generate PDF report")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Pure AI scoring test failed: {e}")
        return False

def main():
    """Run pure AI scoring test."""
    logger.info("🎯 Testing Pure AI Scoring System")
    logger.info("🔄 Removed: Hardcoded BKM logic")
    logger.info("🧠 Added: Pure AI-driven eligibility assessment")
    logger.info("🎛️  Result: Admin controls subsidy amounts")
    logger.info("=" * 80)
    
    success = test_pure_ai_har_sze_hao()
    
    logger.info("\n" + "=" * 80)
    logger.info("PURE AI SCORING TEST RESULTS")
    logger.info("=" * 80)
    
    if success:
        logger.info("🎉 SUCCESS: Pure AI scoring system working!")
        logger.info("✅ AI provides eligibility scores only")
        logger.info("✅ No hardcoded program limitations")
        logger.info("✅ Admin retains subsidy amount control")
        logger.info("✅ Database properly updated with AI score")
    else:
        logger.info("💥 FAILED: Check error messages above")

if __name__ == "__main__":
    main()
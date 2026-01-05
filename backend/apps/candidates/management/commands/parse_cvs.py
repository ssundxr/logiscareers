"""
Management command to parse CV text from uploaded CV files.
This can be used to process existing CVs that were uploaded before
the automatic CV text extraction was implemented.
"""

from django.core.management.base import BaseCommand
from apps.candidates.models import CandidateProfile
from apps.candidates.utils import extract_cv_text, clean_cv_text


class Command(BaseCommand):
    help = 'Extract text from uploaded CV files and save to cv_text field'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Process all candidates, even those with existing cv_text',
        )
        parser.add_argument(
            '--candidate-id',
            type=int,
            help='Process a specific candidate by ID',
        )

    def handle(self, *args, **options):
        if options['candidate_id']:
            # Process specific candidate
            try:
                candidate = CandidateProfile.objects.get(id=options['candidate_id'])
                self.process_candidate(candidate)
            except CandidateProfile.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Candidate with ID {options["candidate_id"]} not found')
                )
        else:
            # Process all candidates with CV files
            queryset = CandidateProfile.objects.exclude(cv_file='')
            
            if not options['all']:
                # Only process candidates without cv_text
                queryset = queryset.filter(cv_text='')
            
            total = queryset.count()
            self.stdout.write(f'Found {total} candidates to process')
            
            processed = 0
            succeeded = 0
            failed = 0
            
            for candidate in queryset:
                processed += 1
                self.stdout.write(f'Processing {processed}/{total}: {candidate.user.get_full_name()}...')
                
                if self.process_candidate(candidate):
                    succeeded += 1
                else:
                    failed += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'\nCompleted! Processed: {processed}, Succeeded: {succeeded}, Failed: {failed}'
            ))

    def process_candidate(self, candidate):
        """Process a single candidate's CV file."""
        if not candidate.cv_file:
            self.stdout.write(self.style.WARNING(f'  No CV file for {candidate.user.get_full_name()}'))
            return False
        
        try:
            cv_text = extract_cv_text(candidate.cv_file.path)
            
            if cv_text:
                candidate.cv_text = clean_cv_text(cv_text)
                candidate.save(update_fields=['cv_text'])
                
                char_count = len(cv_text)
                self.stdout.write(self.style.SUCCESS(
                    f'  Successfully extracted {char_count} characters'
                ))
                return True
            else:
                self.stdout.write(self.style.ERROR(
                    f'  Failed to extract text from {candidate.cv_file.path}'
                ))
                return False
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'  Error processing CV: {str(e)}'
            ))
            return False

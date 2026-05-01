import uuid
from django.db import models


class FeeCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_recurring = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fee_categories'
        verbose_name_plural = 'fee categories'

    def __str__(self):
        return self.name


class FeeStructure(models.Model):
    class_group = models.ForeignKey(
        'academics.Class', on_delete=models.CASCADE, related_name='fee_structures'
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear', on_delete=models.CASCADE, related_name='fee_structures'
    )
    category = models.ForeignKey(
        FeeCategory, on_delete=models.CASCADE, related_name='structures'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fee_structures'
        unique_together = [('class_group', 'academic_year', 'category')]

    def __str__(self):
        return f"{self.class_group} — {self.category} ({self.academic_year})"


class StudentFee(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIAL = 'partial', 'Partial'
        PAID = 'paid', 'Paid'
        WAIVED = 'waived', 'Waived'

    student = models.ForeignKey(
        'students.StudentProfile', on_delete=models.CASCADE, related_name='fees'
    )
    fee_structure = models.ForeignKey(
        FeeStructure, on_delete=models.CASCADE, related_name='student_fees'
    )
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_fees'
        unique_together = [('student', 'fee_structure')]

    @property
    def net_amount(self):
        return self.amount_due - self.discount

    @property
    def amount_paid(self):
        return sum(p.amount_paid for p in self.payments.all())

    @property
    def balance(self):
        return self.net_amount - self.amount_paid

    def __str__(self):
        return f"{self.student} — {self.fee_structure.category}"


class FeePayment(models.Model):
    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        ONLINE = 'online', 'Online'
        CHEQUE = 'cheque', 'Cheque'
        DD = 'dd', 'Demand Draft'

    student_fee = models.ForeignKey(
        StudentFee, on_delete=models.CASCADE, related_name='payments'
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    receipt_number = models.CharField(max_length=30, unique=True)
    remarks = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fee_payments'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Receipt {self.receipt_number}"

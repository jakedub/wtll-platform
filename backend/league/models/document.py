import os
from django.db import models


def document_upload_path(instance, filename):
    """Store under media/documents/<folder_name>/<filename>"""
    safe_folder = instance.folder_name.replace(" ", "_").replace("/", "_")
    return os.path.join("documents", safe_folder, filename)


class UploadedDocument(models.Model):
    folder_name = models.CharField(max_length=200)
    display_name = models.CharField(max_length=300)
    file = models.FileField(upload_to=document_upload_path)
    description = models.TextField(blank=True)
    tag = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.PositiveIntegerField(default=0)  # bytes

    class Meta:
        ordering = ["folder_name", "display_name"]

    def __str__(self):
        return f"{self.folder_name} / {self.display_name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.file:
            try:
                self.file_size = self.file.size
                super().save(update_fields=["file_size"])
            except Exception:
                pass

    @property
    def filename(self):
        return os.path.basename(self.file.name) if self.file else ""

    @property
    def extension(self):
        _, ext = os.path.splitext(self.filename)
        return ext.lower().lstrip(".")

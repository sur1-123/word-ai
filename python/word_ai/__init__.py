"""
Word AI Editor - Python Service Package
Version: 0.1.0
"""

__version__ = "0.1.0"
__author__ = "srd19933311042"

from word_ai.server import create_mcp_server
from word_ai.streaming import StreamingDocxParser
from word_ai.history import HistoryManager
from word_ai.docx import DocumentProcessor

__all__ = [
    "create_mcp_server",
    "StreamingDocxParser",
    "HistoryManager",
    "DocumentProcessor",
]

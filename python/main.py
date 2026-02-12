"""
Word AI Editor - Python Service Entry Point
Version: 0.1.0

This service handles document processing, streaming, and MCP server functionality.
"""

from word_ai.server import create_mcp_server
from word_ai.streaming import StreamingDocxParser
from word_ai.history import HistoryManager
from word_ai.docx.processor import DocumentProcessor
import asyncio
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point for the Python service."""
    logger.info("Starting Word AI Editor Python Service v0.1.0")

    # Initialize core components
    history_manager = HistoryManager(
        db_path="data/history/operations.db",
        snapshot_dir="data/history/snapshots"
    )

    doc_processor = DocumentProcessor(history_manager=history_manager)

    # Create MCP server
    mcp_server = create_mcp_server(doc_processor, history_manager)

    # Start all services
    tasks = [
        mcp_server.run(),
        run_health_check(),
    ]

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("Shutting down Word AI Editor Python Service")
    finally:
        await history_manager.close()


async def run_health_check():
    """Health check endpoint for service monitoring."""
    while True:
        await asyncio.sleep(30)
        logger.debug("Health check: service running")


if __name__ == "__main__":
    asyncio.run(main())

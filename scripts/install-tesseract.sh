#!/bin/bash

# Tesseract OCR Installation Script
# This script helps install Tesseract OCR on different operating systems

echo "🔍 Checking operating system..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected"
    
    # Check if apt is available (Ubuntu/Debian)
    if command -v apt &> /dev/null; then
        echo "📦 Installing Tesseract via apt..."
        sudo apt update
        sudo apt install -y tesseract-ocr tesseract-ocr-eng
        echo "✅ Tesseract installed via apt"
    
    # Check if yum is available (CentOS/RHEL)
    elif command -v yum &> /dev/null; then
        echo "📦 Installing Tesseract via yum..."
        sudo yum install -y tesseract tesseract-langpack-eng
        echo "✅ Tesseract installed via yum"
    
    # Check if dnf is available (Fedora)
    elif command -v dnf &> /dev/null; then
        echo "📦 Installing Tesseract via dnf..."
        sudo dnf install -y tesseract tesseract-langpack-eng
        echo "✅ Tesseract installed via dnf"
    
    else
        echo "❌ Unsupported Linux package manager. Please install Tesseract manually."
        exit 1
    fi

elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected"
    
    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo "📦 Installing Tesseract via Homebrew..."
        brew install tesseract
        echo "✅ Tesseract installed via Homebrew"
    else
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi

elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "🪟 Windows detected"
    echo "📦 Please install Tesseract manually from:"
    echo "   https://github.com/UB-Mannheim/tesseract/wiki"
    echo "   Or use Chocolatey: choco install tesseract"
    exit 1

else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

# Verify installation
echo "🔍 Verifying Tesseract installation..."
if command -v tesseract &> /dev/null; then
    echo "✅ Tesseract is installed and available"
    tesseract --version
else
    echo "❌ Tesseract installation failed"
    exit 1
fi

echo "🎉 Tesseract OCR installation completed successfully!"
echo "📝 You can now use the OCR functionality in your application." 
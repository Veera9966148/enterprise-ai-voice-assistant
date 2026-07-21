# Android Native Implementation Guide: AI Voice Assistant

This guide provides a complete, production-ready implementation of the **AI Voice Assistant** for a native Android application using **Kotlin**, **Jetpack Compose**, and the official **Google Generative AI SDK**.

---

## 1. System Architecture on Android

To match the behavior of our Web Voice Assistant, the Android app will orchestrate three key subsystems:
1. **Speech-to-Text (STT)**: Handles microphone capture and real-time voice-to-text transcription using Android's native `SpeechRecognizer`.
2. **AI Reasoning**: Connects to the **Gemini 2.5/1.5 Flash** model via the official Google Generative AI Kotlin SDK.
3. **Text-to-Speech (TTS)**: Translates the AI's plain-text responses into high-quality spoken audio using Android's built-in `TextToSpeech` engine.

```
       [User Voice] ──>  SpeechRecognizer (STT)  ──>  [Plain Text]
                                                            │
                                                            ▼
       [Audio Playback] <──  TextToSpeech (TTS)  <──  Gemini API (Kotlin SDK)
```

---

## 2. Setup and Prerequisites

### A. Add Permissions (`AndroidManifest.xml`)
To capture audio and communicate with the Gemini API, declare these permissions inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### B. Add Dependencies (`build.gradle.kts`)
Include the standard Jetpack Compose tooling, Material 3, and the official Google Generative AI SDK in your module-level build file:

```kotlin
dependencies {
    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.runtime:runtime-livedata")
    
    // Lifecycle & Viewmodel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Google Generative AI (Gemini SDK)
    implementation("com.google.android.generativeai:generativeai:0.7.0")

    // Icons
    implementation("androidx.compose.material:material-icons-extended")
}
```

---

## 3. Complete Codebase Implementation

Create these files inside your package directory (e.g. `com.example.voiceassistant/`).

### File A: `VoiceAssistantViewModel.kt`
This ViewModel coordinates the AI voice state transitions (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`), tracks the message logs, and connects to the Gemini API.

```kotlin
package com.example.voiceassistant

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.ai.client.generativeai.type.generationConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.UUID

enum class AssistantState {
    IDLE, LISTENING, THINKING, SPEAKING
}

enum class Persona(
    val label: String,
    val description: String,
    val hexColor: String,
    val suggestedPrompts: List<String>
) {
    FRIENDLY(
        "Friendly & Warm",
        "Cheerful, enthusiastic, and highly empathetic companion.",
        "#10B981", // Emerald
        listOf("Tell me a cheerful short story", "I had a busy day, can we chat?", "Give me a positive quote for today")
    ),
    PROFESSIONAL(
        "Professional Expert",
        "Highly articulate, efficient, direct, and intelligent.",
        "#3B82F6", // Blue
        listOf("Explain quantum computing simply", "Draft a professional reply to a client", "Give me productivity tips")
    ),
    WITTY(
        "Witty & Playful",
        "Energetic, funny, and loves a good banter.",
        "#F59E0B", // Amber
        listOf("Tell me a hilarious joke", "Do you think robots will take over?", "Who would win: ninja vs pirate?")
    ),
    ZEN(
        "Zen Mindful",
        "Calm, peaceful, soothing, and encourages mindfulness.",
        "#A855F7", // Purple
        listOf("Guide me through a breathing exercise", "What is a beautiful zen proverb?", "Describe a beach at sunset")
    ),
    TECH(
        "Tech Guru",
        "Nerdily passionate about coding, gadgets, and the future.",
        "#06B6D4", // Cyan
        listOf("How does recursion work?", "What is the future of AI in 10 years?", "Give me a terminal cheat sheet")
    )
}

data class VoiceMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isSpeech: Boolean = false
)

class VoiceAssistantViewModel(application: Application) : AndroidViewModel(application) {

    var assistantState by mutableStateOf(AssistantState.IDLE)
        private set

    var currentPersona by mutableStateOf(Persona.FRIENDLY)
        private set

    var assistantName by mutableStateOf("Echo")
        private set

    var voiceRate by mutableStateOf(1.0f)
    var voicePitch by mutableStateOf(1.0f)
    var isMuted by mutableStateOf(false)
    var isContinuousListening by mutableStateOf(false)

    private val _messages = MutableStateFlow<List<VoiceMessage>>(emptyList())
    val messages: StateFlow<List<VoiceMessage>> = _messages

    var interimTranscript by mutableStateOf("")

    // Retrieve your key safely (e.g., BuildConfig, gradle.properties, or local variables)
    private val apiKey = "YOUR_GEMINI_API_KEY" 

    fun updatePersona(persona: Persona) {
        currentPersona = persona
    }

    fun updateAssistantName(name: String) {
        assistantName = name
    }

    fun setInterimText(text: String) {
        interimTranscript = text
    }

    fun updateState(state: AssistantState) {
        assistantState = state
    }

    fun addMessage(role: String, content: String, isSpeech: Boolean) {
        val msg = VoiceMessage(role = role, content = content, isSpeech = isSpeech)
        _messages.value = _messages.value + msg
    }

    fun clearHistory() {
        _messages.value = emptyList()
        assistantState = AssistantState.IDLE
    }

    fun handleSendPrompt(prompt: String, onResponseReady: (String) -> Unit) {
        if (prompt.isBlank()) return
        
        addMessage("user", prompt, isSpeech = (assistantState == AssistantState.LISTENING))
        assistantState = AssistantState.THINKING
        interimTranscript = ""

        viewModelScope.launch {
            try {
                // Configure instructions matching Web Persona configurations
                val systemInstruction = """
                    You are a highly capable, human-like voice assistant. Your name is $assistantName.
                    Key instructions for your speech:
                    1. Keep responses concise, simple, natural, and conversational. Limit responses to 2-3 sentences max.
                    2. STRICTLY avoid markdown formatting (e.g. asterisks, lists, hashtags, bold characters). Use plain English.
                    3. Spell out abbreviations or technical symbols if they sound strange when spoken. (e.g., "percent" instead of "%").
                    Persona Guidelines:
                """.trimIndent() + when (currentPersona) {
                    Persona.FRIENDLY -> "\nBe cheerful, enthusiastic, warm, and highly empathetic."
                    Persona.PROFESSIONAL -> "\nBe extremely professional, clear, and direct. Skip the fluff."
                    Persona.WITTY -> "\nBe funny, witty, playful, and slightly sarcastic."
                    Persona.ZEN -> "\nBe calm, soothing, peaceful, and mindful."
                    Persona.TECH -> "\nBe a passionate, enthusiastic tech guru with nerdy analogies."
                }

                val generativeModel = GenerativeModel(
                    modelName = "gemini-1.5-flash",
                    apiKey = apiKey,
                    generationConfig = generationConfig {
                        temperature = 0.7f
                    },
                    systemInstruction = content { text(systemInstruction) }
                )

                // Assemble history
                val chatHistory = _messages.value.map {
                    content(role = if (it.role == "user") "user" else "model") {
                        text(it.content)
                    }
                }

                val response = generativeModel.generateContent(*chatHistory.toTypedArray())
                val replyText = response.text ?: "I am sorry, I couldn't process that response."

                addMessage("assistant", replyText, isSpeech = !isMuted)
                onResponseReady(replyText)
            } catch (e: Exception) {
                val errorText = "Sorry, I had trouble connecting. ${e.localizedMessage}"
                addMessage("assistant", errorText, isSpeech = false)
                onResponseReady(errorText)
                assistantState = AssistantState.IDLE
            }
        }
    }
}
```

---

### File B: `MainActivity.kt`
This entrypoint activity requests runtime permissions, binds native Android `SpeechRecognizer` to capture user speech, and orchestrates the text-to-speech feedback.

```kotlin
package com.example.voiceassistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.core.content.ContextCompat
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private val viewModel: VoiceAssistantViewModel by viewModels()
    private lateinit var tts: TextToSpeech
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var recognizerIntent: Intent

    // Ask for Mic Permission dynamically
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            initSpeechRecognizer()
        } else {
            Toast.makeText(this, "Microphone permission is required for voice commands.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize TTS
        tts = TextToSpeech(this, this)

        // Request permission if not already active
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            initSpeechRecognizer()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }

        setContent {
            val darkTheme = isSystemInDarkTheme()
            MaterialTheme(
                colorScheme = if (darkTheme) darkColorScheme() else lightColorScheme()
            ) {
                VoiceAssistantScreen(
                    viewModel = viewModel,
                    onStartListening = { startSpeechListening() },
                    onStopListening = { stopSpeechListening() },
                    onSpeakText = { text -> speakOut(text) }
                )
            }
        }
    }

    private fun initSpeechRecognizer() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }

        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                viewModel.updateState(AssistantState.LISTENING)
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {
                // If you want to bind real rmsdB value to visual orb, you can update level inside viewModel
            }
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                viewModel.updateState(AssistantState.THINKING)
            }

            override fun onError(error: Int) {
                viewModel.updateState(AssistantState.IDLE)
                val errMsg = when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH -> "No voice matching found."
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Engine busy. Please retry."
                    else -> "STT Error code: $error"
                }
                Toast.makeText(this@MainActivity, errMsg, Toast.LENGTH_SHORT).show()
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val speechText = matches[0]
                    viewModel.handleSendPrompt(speechText) { reply ->
                        speakOut(reply)
                    }
                } else {
                    viewModel.updateState(AssistantState.IDLE)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    viewModel.setInterimText(matches[0])
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    private fun startSpeechListening() {
        if (::speechRecognizer.isInitialized) {
            if (tts.isSpeaking) {
                tts.stop()
            }
            speechRecognizer.startListening(recognizerIntent)
        }
    }

    private fun stopSpeechListening() {
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.stopListening()
            viewModel.updateState(AssistantState.IDLE)
        }
    }

    private fun speakOut(text: String) {
        if (viewModel.isMuted) {
            viewModel.updateState(AssistantState.IDLE)
            return
        }

        tts.setSpeechRate(viewModel.voiceRate)
        tts.setPitch(viewModel.voicePitch)

        // Clear markdown annotations from text
        val cleanText = text.replace(Regex("[*#_\\[\\]()+\\-`>]"), "").trim()

        viewModel.updateState(AssistantState.SPEAKING)
        tts.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "AssistantResponse")
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale.US
            tts.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    viewModel.updateState(AssistantState.SPEAKING)
                }

                override fun onDone(utteranceId: String?) {
                    viewModel.updateState(AssistantState.IDLE)
                    if (viewModel.isContinuousListening) {
                        runOnUiThread {
                            startSpeechListening()
                        }
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    viewModel.updateState(AssistantState.IDLE)
                }
            })
        }
    }

    override fun onDestroy() {
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.destroy()
        }
        if (::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        super.onDestroy()
    }
}
```

---

### File C: `VoiceAssistantScreen.kt`
A beautiful declarative Compose UI matching our web application visual framework, including the pulsing voice orb, sliding configurations, active persona selection, and historical logs.

```kotlin
package com.example.voiceassistant

import android.graphics.Color.parseColor
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceAssistantScreen(
    viewModel: VoiceAssistantViewModel,
    onStartListening: () -> Unit,
    onStopListening: () -> Unit,
    onSpeakText: (String) -> Unit
) {
    val messages by viewModel.messages.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var textInput by remember { mutableStateOf("") }

    // Auto scroll to bottom of logs
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "AI Voice Assistant",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Powered by Gemini 1.5 Flash",
                            fontSize = 10.sp,
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.clearHistory() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Clear Session")
                    }
                }
            )
        }
    ) { paddingValues ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
        ) {
            // LEFT COLUMN: Voice Orb & Quick Tools (Weight = 1.2)
            Column(
                modifier = Modifier
                    .weight(1.2f)
                    .fillMaxHeight()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Active State Indicator
                Box(
                    modifier = Modifier
                        .background(
                            Color(parseColor(viewModel.currentPersona.hexColor)).copy(alpha = 0.15f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .border(
                            1.dp,
                            Color(parseColor(viewModel.currentPersona.hexColor)).copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 12.dp, py = 6.dp)
                ) {
                    Text(
                        text = "${viewModel.assistantName} (${viewModel.currentPersona.label})",
                        color = Color(parseColor(viewModel.currentPersona.hexColor)),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Custom Central Voice Orb Canvas
                ComposeVoiceOrb(
                    state = viewModel.assistantState,
                    baseColor = Color(parseColor(viewModel.currentPersona.hexColor))
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Action controls
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Interim Feedback Screen
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize().padding(8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (viewModel.interimTranscript.isNotEmpty()) {
                                Text(
                                    text = "... ${viewModel.interimTranscript} ...",
                                    fontSize = 14.sp,
                                    fontStyle = FontStyle.Italic,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            } else {
                                Text(
                                    text = when (viewModel.assistantState) {
                                        AssistantState.LISTENING -> "Go ahead, speak..."
                                        AssistantState.THINKING -> "Consulting Gemini..."
                                        AssistantState.SPEAKING -> "Synthesizing audio..."
                                        else -> "Tap the Mic below to start"
                                    },
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (viewModel.assistantState == AssistantState.LISTENING) {
                            Button(
                                onClick = onStopListening,
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.height(56.dp)
                            ) {
                                Icon(Icons.Default.MicOff, contentDescription = "Stop", modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Stop Listening", fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Button(
                                onClick = onStartListening,
                                enabled = viewModel.assistantState != AssistantState.THINKING,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(parseColor(viewModel.currentPersona.hexColor))
                                ),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.height(56.dp)
                            ) {
                                Icon(Icons.Default.Mic, contentDescription = "Mic", modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Talk to ${viewModel.assistantName}", fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        // Audio Toggle
                        IconButton(
                            onClick = { viewModel.isMuted = !viewModel.isMuted },
                            modifier = Modifier
                                .size(56.dp)
                                .background(MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(16.dp))
                        ) {
                            Icon(
                                imageVector = if (viewModel.isMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                                contentDescription = "Audio Mode",
                                tint = if (viewModel.isMuted) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Fallback Text Form
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = textInput,
                            onValueChange = { textInput = it },
                            placeholder = { Text("Type instead...") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (textInput.isNotBlank()) {
                                    val input = textInput
                                    textInput = ""
                                    viewModel.handleSendPrompt(input) { reply ->
                                        onSpeakText(reply)
                                    }
                                }
                            },
                            enabled = textInput.isNotBlank() && viewModel.assistantState != AssistantState.THINKING,
                            modifier = Modifier
                                .size(50.dp)
                                .background(MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp))
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.white)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(24.dp))

            // RIGHT COLUMN: Conversation History logs & Settings
            Column(
                modifier = Modifier
                    .weight(1.5f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Logs Panel (Weight 1)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1.2f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Conversation Transcript", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))

                        if (messages.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No active conversation logs", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        } else {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(messages) { msg ->
                                    val isUser = msg.role == "user"
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .background(
                                                    color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                                    shape = RoundedCornerShape(
                                                        topStart = 12.dp,
                                                        topEnd = 12.dp,
                                                        bottomStart = if (isUser) 12.dp else 0.dp,
                                                        bottomEnd = if (isUser) 0.dp else 12.dp
                                                    )
                                                )
                                                .padding(horizontal = 12.dp, py = 8.dp)
                                        ) {
                                            Text(
                                                text = msg.content,
                                                color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                fontSize = 13.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Persona Config Panel
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Select Persona", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Persona.entries.forEach { p ->
                                val selected = viewModel.currentPersona == p
                                FilterChip(
                                    selected = selected,
                                    onClick = { viewModel.updatePersona(p) },
                                    label = { Text(p.label) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ComposeVoiceOrb(
    state: AssistantState,
    baseColor: Color
) {
    val infiniteTransition = rememberInfiniteTransition(label = "Orb Pulsing")

    // Pulsing Scale animation
    val scale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = if (state == AssistantState.LISTENING) 1.25f else if (state == AssistantState.THINKING) 1.1f else 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, ease = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "OrbScale"
    )

    // Radiant Ripples Alpha Animation
    val waveAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, ease = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "RippleAlpha"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(180.dp)
    ) {
        // Drawing custom ambient waves inside Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = this.center
            val radius = 60.dp.toPx()

            if (state == AssistantState.LISTENING || state == AssistantState.SPEAKING) {
                // Drawing outer radiating aura ripple
                drawCircle(
                    color = baseColor,
                    radius = radius * (1.1f + (waveAlpha * 0.7f)),
                    alpha = waveAlpha,
                    style = Stroke(width = 4f)
                )
            }
        }

        // Main core sphere
        Box(
            modifier = Modifier
                .size(100.dp)
                .shadow(elevation = 12.dp, shape = CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            baseColor.copy(alpha = 0.9f),
                            baseColor.darken()
                        )
                    ),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = when (state) {
                    AssistantState.LISTENING -> Icons.Default.Mic
                    AssistantState.THINKING -> Icons.Default.HourglassEmpty
                    AssistantState.SPEAKING -> Icons.Default.VolumeUp
                    else -> Icons.Default.Mic
                },
                contentDescription = "Orb State Icon",
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
        }
    }
}

// Utility extension helper for color darken
fun Color.darken(): Color {
    return Color(
        red = (this.red * 0.7f).coerceIn(0f, 1f),
        green = (this.green * 0.7f).coerceIn(0f, 1f),
        blue = (this.blue * 0.7f).coerceIn(0f, 1f),
        alpha = this.alpha
    )
}
```

import {isChordToken, tokenizeLine} from "../src/chordsUtils";
import {ChordSymbolRange} from "../src/editor-extension/chordSheetsViewPlugin";
import {transpose} from "../src/chordProcessing";
import {ChangeSet, Text} from "@codemirror/state";
import {testingSong} from "./data/testing-song";
import {testingSongInline} from "./data/testing-song-inline";

function getChordSymbolRangesForLine(line: string, lineIndex = 0): ChordSymbolRange[] {
	const { tokens } = tokenizeLine(line, lineIndex, '%c', '%t');

	return tokens
		.filter(isChordToken)
		.map(token => ({
			from: token.index[0] + token.chordSymbolIndex[0],
			to: token.index[0] + token.chordSymbolIndex[1],
			chordSymbol: token.chordSymbol,
			chord: token.chord
		}));
}

function getChordRangesForSheet(sheet: string) {
	const text = Text.of(sheet.split('\n'));
	const chordRanges: ChordSymbolRange[] = [];
	for (let i = 1; i <= text.lines; i++) {
		const line = text.line(i);
		const chordRangesForLine = getChordSymbolRangesForLine(line.text, line.from);
		chordRanges.push(...chordRangesForLine);
	}
	return {text, chordRanges};
}


describe('Transposition', () => {

	test('should transpose a simple chord', () => {
		const chordRanges = getChordSymbolRangesForLine('Am');
		const changes = transpose(chordRanges, "up");

		expect(changes).toEqual([
			{ from: 0, to: 2, insert: 'A#m' }
		]);
	});

	test('should transpose simple chords up', () => {
		const chordRanges = getChordSymbolRangesForLine('Am C');
		const changes = transpose(chordRanges, "up");

		expect(changes).toEqual([
			{ from: 0, to: 2, insert: 'A#m' },
			{ from: 3, to: 4, insert: 'C#' }
		]);
	});

	test('should transpose slash chords up', () => {
		const chordRanges = getChordSymbolRangesForLine('C/G');
		const changes = transpose(chordRanges, "up");

		expect(changes).toEqual([
			{ from: 0, to: 3, insert: 'C#/G#' }
		]);
	});

	test('should transpose chords down', () => {
		const chordRanges = getChordSymbolRangesForLine('Dm7 Bbmaj7 C/G');
		const changes = transpose(chordRanges, "down");

		expect(changes).toEqual([
			{ from: 0, to: 3, insert: 'C#m7' },
			{ from: 4, to: 10, insert: 'Amaj7' },
			{ from: 11, to: 14, insert: 'B/F#' },
		]);
	});

	test('should transpose inline chords', () => {
		const chordRanges = getChordSymbolRangesForLine('[Am]Some [Cmaj7/G]text [Dm7/C aux text]');
		const changes = transpose(chordRanges, "up");
		expect(changes).toEqual([
			{ from: 1, to: 3, insert: 'A#m' },
			{ from: 10, to: 17, insert: 'C#maj7/G#' },
			{ from: 24, to: 29, insert: 'D#m7/C#' },
		]);
	});

	test('should not transpose user-defined chords', () => {
		const chordRanges = getChordSymbolRangesForLine('Am*[x02210]');
		const changes = transpose(chordRanges, "up");

		expect(changes).toEqual([]);
	});



	function testTransposeSheet(
		direction: "up" | "down",
		testCases: [index: string, sheet: string][]
	) {
		test.each(testCases.slice(1))(`should transpose %d step(s) ${direction}`, (index, transposedSheet) => {
			const sourceSheet = testCases[parseInt(index) - 1][1];
			const {text, chordRanges} = getChordRangesForSheet(sourceSheet);
			const changes = transpose(chordRanges, direction);
			const result = ChangeSet.of(changes, sourceSheet.length).apply(text).toString();
			expect(result).toEqual(transposedSheet);
		});
	}

	describe('should correctly transpose longer sheets, chords-over-lyrics', () => {

		const upwardsTests: [index: string, sheet: string][] = Object.entries([testingSong.orig, ...testingSong.up]);
		const downwardsTests: [index: string, sheet: string][] = Object.entries([testingSong.orig, ...testingSong.down]);

		testTransposeSheet("up", upwardsTests);
		testTransposeSheet("down", downwardsTests);
	});

	describe('should correctly transpose longer sheets, inline chords', () => {
		const upwardsTests: [index: string, sheet: string][] = Object.entries([testingSongInline.orig, ...testingSongInline.up]);
		const downwardsTests: [index: string, sheet: string][] = Object.entries([testingSongInline.orig, ...testingSongInline.down]);

		testTransposeSheet("up", upwardsTests);
		testTransposeSheet("down", downwardsTests);

	});
});
